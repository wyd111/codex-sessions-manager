import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const stripExtendedPrefix = (value) => String(value || '').replace(/^\\\\\?\\/, '');

const normalizeKey = (value) => {
  const cleaned = stripExtendedPrefix(value).trim();
  if (!cleaned) return '';
  return path.normalize(cleaned).replace(/[\\/]+$/, '').toLowerCase();
};

const normalizeDisplayPath = (value) => path.normalize(stripExtendedPrefix(value).trim());

const readFirstJsonBlock = (filePath) => {
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(64 * 1024);
  const parts = [];
  let started = false;
  let depth = 0;
  let inString = false;
  let escaping = false;

  try {
    let bytesRead = 0;
    while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) {
      let sliceStart = 0;

      for (let index = 0; index < bytesRead; index += 1) {
        const byte = buffer[index];

        if (!started) {
          const isBomByte = byte === 0xef || byte === 0xbb || byte === 0xbf;
          const isWhitespace =
            byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
          if (isBomByte || isWhitespace) continue;
          if (byte !== 0x7b) return null;

          started = true;
          depth = 1;
          sliceStart = index;
          continue;
        }

        if (inString) {
          if (escaping) {
            escaping = false;
          } else if (byte === 0x5c) {
            escaping = true;
          } else if (byte === 0x22) {
            inString = false;
          }
          continue;
        }

        if (byte === 0x22) {
          inString = true;
        } else if (byte === 0x7b) {
          depth += 1;
        } else if (byte === 0x7d) {
          depth -= 1;
          if (depth === 0) {
            parts.push(Buffer.from(buffer.subarray(sliceStart, index + 1)));
            return JSON.parse(Buffer.concat(parts).toString('utf8'));
          }
        }
      }

      if (started) {
        parts.push(Buffer.from(buffer.subarray(sliceStart, bytesRead)));
      }
    }
  } finally {
    fs.closeSync(fd);
  }

  return null;
};

const walkJsonlFiles = (dir, files = []) => {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonlFiles(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      files.push(full);
    }
  }
  return files;
};

const collectRemainingSessions = (codexHome, warnings) => {
  const ids = new Set();
  const projectKeys = new Set();

  for (const rootName of ['sessions', 'archived_sessions']) {
    const root = path.join(codexHome, rootName);
    for (const filePath of walkJsonlFiles(root)) {
      try {
        const first = readFirstJsonBlock(filePath);
        const id = String(first?.payload?.id || '').trim();
        const cwd = normalizeKey(first?.payload?.cwd || '');
        if (id) ids.add(id);
        if (cwd) projectKeys.add(cwd);
      } catch (err) {
        warnings.push(`读取会话元数据失败：${filePath}：${err.message}`);
      }
    }
  }

  return { ids, projectKeys };
};

const cleanupSessionIndex = (codexHome, deletedIds, warnings) => {
  const indexPath = path.join(codexHome, 'session_index.jsonl');
  if (!fs.existsSync(indexPath) || !deletedIds.size) return 0;

  try {
    const raw = fs.readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, '');
    const kept = [];
    let removed = 0;

    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const entry = JSON.parse(trimmed);
        const id = String(entry?.id || '').trim();
        if (id && deletedIds.has(id)) {
          removed += 1;
        } else {
          kept.push(JSON.stringify(entry));
        }
      } catch (err) {
        warnings.push(`保留损坏的 session_index 行：${err.message}`);
        kept.push(line);
      }
    }

    if (removed > 0) {
      fs.writeFileSync(indexPath, `${kept.join('\n')}${kept.length ? '\n' : ''}`);
    }

    return removed;
  } catch (err) {
    warnings.push(`清理 session_index.jsonl 失败：${err.message}`);
    return 0;
  }
};

const cleanupThreadsSqlite = (codexHome, deletedSessionIds, touchedProjectKeys, warnings) => {
  const dbPath = path.join(codexHome, 'state_5.sqlite');
  if (!fs.existsSync(dbPath)) return { deleted: 0, remainingProjectKeys: new Set() };

  try {
    const script = String.raw`
import json
import os
import sqlite3
import sys

db_path = sys.argv[1]
payload = json.loads(sys.argv[2])
deleted_ids = set(payload.get("deletedIds", []))
touched_project_keys = set(payload.get("touchedProjectKeys", []))

def strip_extended(value):
    value = str(value or "")
    return value[4:] if value.startswith("\\\\?\\") else value

def normalize_key(value):
    value = strip_extended(value).strip()
    if not value:
        return ""
    return os.path.normcase(os.path.normpath(value)).rstrip("\\/")

conn = sqlite3.connect(db_path, timeout=1)
try:
    table = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'threads'"
    ).fetchone()
    if not table:
        print(json.dumps({"deleted": 0, "remainingProjectKeys": []}))
        sys.exit(0)

    rows = conn.execute("SELECT id, rollout_path, cwd FROM threads").fetchall()
    ids_to_delete = []
    remaining_project_keys = set()

    for thread_id, rollout_path, cwd in rows:
        thread_id = str(thread_id or "")
        normalized_rollout = strip_extended(rollout_path)
        cwd_key = normalize_key(cwd)
        missing_rollout = not normalized_rollout or not os.path.exists(normalized_rollout)
        deleted_by_request = thread_id in deleted_ids
        touched_missing = missing_rollout and cwd_key in touched_project_keys

        if deleted_by_request or touched_missing:
            ids_to_delete.append(thread_id)
            continue

        if not missing_rollout and cwd_key:
            remaining_project_keys.add(cwd_key)

    if ids_to_delete:
        conn.execute("BEGIN IMMEDIATE")
        try:
            conn.executemany("DELETE FROM threads WHERE id = ?", [(item,) for item in ids_to_delete])
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    print(json.dumps({
        "deleted": len(ids_to_delete),
        "remainingProjectKeys": sorted(remaining_project_keys),
    }))
finally:
    conn.close()
`;

    const child = spawnSync(
      process.env.PYTHON || 'python',
      [
        '-c',
        script,
        dbPath,
        JSON.stringify({
          deletedIds: Array.from(deletedSessionIds),
          touchedProjectKeys: Array.from(touchedProjectKeys),
        }),
      ],
      { encoding: 'utf8' },
    );

    if (child.status !== 0) {
      const message = child.stderr?.trim() || child.stdout?.trim() || `exit ${child.status}`;
      throw new Error(message);
    }

    const parsed = JSON.parse(child.stdout || '{}');
    return {
      deleted: Number(parsed.deleted || 0),
      remainingProjectKeys: new Set(parsed.remainingProjectKeys || []),
    };
  } catch (err) {
    warnings.push(`清理 state_5.sqlite 失败：${err.message}`);
    return { deleted: 0, remainingProjectKeys: new Set() };
  }
};

const removeTouchedEmptyProjects = (state, touchedProjectKeys, validProjectKeys) => {
  const removed = [];
  const shouldRemove = (value) => {
    const key = normalizeKey(value);
    return key && touchedProjectKeys.has(key) && !validProjectKeys.has(key);
  };

  for (const field of ['electron-saved-workspace-roots', 'project-order', 'active-workspace-roots']) {
    if (!Array.isArray(state[field])) continue;
    const next = [];
    for (const value of state[field]) {
      if (shouldRemove(value)) {
        removed.push(normalizeDisplayPath(value));
      } else {
        next.push(value);
      }
    }
    state[field] = next;
  }

  const atomState = state['electron-persisted-atom-state'];
  if (atomState && typeof atomState === 'object') {
    for (const key of Object.keys(atomState)) {
      if (!key.startsWith('sidebar-project-expanded-v1-codex:')) continue;
      const projectPath = key.slice('sidebar-project-expanded-v1-codex:'.length);
      if (shouldRemove(projectPath)) {
        delete atomState[key];
        removed.push(normalizeDisplayPath(projectPath));
      }
    }
  }

  return Array.from(new Set(removed));
};

const cleanupGlobalState = (codexHome, touchedProjectKeys, validProjectKeys, warnings) => {
  const statePath = path.join(codexHome, '.codex-global-state.json');
  if (!fs.existsSync(statePath) || !touchedProjectKeys.size) return [];

  try {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const removed = removeTouchedEmptyProjects(state, touchedProjectKeys, validProjectKeys);
    if (removed.length) {
      const backupPath = `${statePath}.bak-session-manager`;
      if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(statePath, backupPath);
      }
      fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
    }
    return removed;
  } catch (err) {
    warnings.push(`清理 .codex-global-state.json 失败：${err.message}`);
    return [];
  }
};

export const cleanupCodexAppState = (
  codexHome,
  { deletedSessionIds = [], touchedProjectPaths = [] } = {},
) => {
  const warnings = [];
  if (!codexHome || !fs.existsSync(codexHome)) {
    return {
      threadsDeleted: 0,
      sessionIndexRemoved: 0,
      projectRootsRemoved: [],
      warnings: ['codexHome 不存在，已跳过 Codex App 索引清理。'],
    };
  }

  const deletedIds = new Set(deletedSessionIds.map((id) => String(id || '').trim()).filter(Boolean));
  const touchedProjectKeys = new Set(
    touchedProjectPaths.map((item) => normalizeKey(item)).filter(Boolean),
  );

  const remaining = collectRemainingSessions(codexHome, warnings);
  const sqlite = cleanupThreadsSqlite(codexHome, deletedIds, touchedProjectKeys, warnings);
  const validProjectKeys = new Set([...remaining.projectKeys, ...sqlite.remainingProjectKeys]);
  const sessionIndexRemoved = cleanupSessionIndex(codexHome, deletedIds, warnings);
  const projectRootsRemoved = cleanupGlobalState(
    codexHome,
    touchedProjectKeys,
    validProjectKeys,
    warnings,
  );

  return {
    threadsDeleted: sqlite.deleted,
    sessionIndexRemoved,
    projectRootsRemoved,
    warnings,
  };
};
