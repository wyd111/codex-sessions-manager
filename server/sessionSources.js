import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { cleanupCodexAppState } from './codexAppCleanup.js';

const stripWrappingQuotes = (value) =>
  String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

const resolveConfiguredPath = (value, cwd) => {
  const cleaned = stripWrappingQuotes(value);
  if (!cleaned) return '';
  return path.isAbsolute(cleaned) ? path.normalize(cleaned) : path.resolve(cwd, cleaned);
};

const jsonlRelativePath = (root, filePath) =>
  path.relative(root, filePath).replace(/\\/g, '/');

const fileUrl = (sourceId, archiveLabel, rel) =>
  `/__session_file/${encodeURIComponent(sourceId)}/${archiveLabel}/${encodeURIComponent(rel)}`;

const getProjectName = (cwd) => {
  const parts = String(cwd || '').split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || '';
};

const basenameWithoutExtension = (filePath) =>
  path.basename(filePath || '').replace(/\.jsonl$/i, '');

const normalizeThreadName = (entry) =>
  String(
    entry?.thread_name ||
      entry?.threadName ||
      entry?.title ||
      entry?.name ||
      '',
  ).trim();

const normalizeUpdatedAt = (entry) =>
  String(entry?.updated_at || entry?.updatedAt || entry?.modified_at || '').trim();

const readSessionIndex = (codexHome) => {
  if (!codexHome) return new Map();

  const indexPath = path.join(codexHome, 'session_index.jsonl');
  if (!fs.existsSync(indexPath)) return new Map();

  const byId = new Map();
  try {
    const raw = fs.readFileSync(indexPath, 'utf8').replace(/^\uFEFF/, '');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const entry = JSON.parse(trimmed);
        const id = String(entry?.id || '').trim();
        if (id) byId.set(id, entry);
      } catch (err) {
        console.warn(`Skipped malformed session_index entry in ${indexPath}:`, err);
      }
    }
  } catch (err) {
    console.warn(`Failed to read session index ${indexPath}:`, err);
  }

  return byId;
};

const readAppThreadIndex = (codexHome) => {
  if (!codexHome) return new Map();

  const dbPath = path.join(codexHome, 'state_5.sqlite');
  if (!fs.existsSync(dbPath)) return new Map();

  try {
    const script = String.raw`
import json
import sqlite3
import sys

db_path = sys.argv[1]
conn = sqlite3.connect(db_path, timeout=1)
conn.row_factory = sqlite3.Row
try:
    table = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'threads'"
    ).fetchone()
    if not table:
        print("[]")
        sys.exit(0)
    rows = conn.execute("SELECT id, title, updated_at, updated_at_ms, cwd FROM threads").fetchall()
    print(json.dumps([dict(row) for row in rows]))
finally:
    conn.close()
`;
    const child = spawnSync(process.env.PYTHON || 'python', ['-c', script, dbPath], {
      encoding: 'utf8',
    });
    if (child.status !== 0) return new Map();

    const rows = JSON.parse(child.stdout || '[]');
    const byId = new Map();
    for (const row of rows) {
      const id = String(row?.id || '').trim();
      if (!id) continue;
      byId.set(id, {
        id,
        title: row.title || '',
        updated_at: row.updated_at || row.updated_at_ms || '',
        cwd: row.cwd || '',
      });
    }
    return byId;
  } catch {
    return new Map();
  }
};

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
          if (byte !== 0x7b) return null; // first JSON block must start with "{"

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
            const raw = Buffer.concat(parts).toString('utf8');
            return JSON.parse(raw);
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

const readSessionFileSummary = (filePath, rel, sessionIndex, appThreadIndex = new Map()) => {
  try {
    const first = readFirstJsonBlock(filePath) || {};
    const sessionId = String(first?.payload?.id || '').trim();
    const appEntry = sessionId ? appThreadIndex.get(sessionId) : null;
    const cwd = String(first?.payload?.cwd || appEntry?.cwd || '').replace(/^\\\\\?\\/, '').trim();
    const indexEntry = sessionId ? sessionIndex.get(sessionId) || appEntry : null;
    const threadName = normalizeThreadName(indexEntry);
    const fallbackName = basenameWithoutExtension(rel || filePath);

    return {
      sessionId: sessionId || fallbackName,
      cwd,
      projectName: getProjectName(cwd) || '未知项目',
      createdAt: first?.timestamp || '',
      threadName,
      displayName: threadName || fallbackName,
      updatedAt: normalizeUpdatedAt(indexEntry) || first?.timestamp || '',
    };
  } catch (err) {
    console.warn(`Failed to read session metadata from ${filePath}:`, err);
    const fallbackName = basenameWithoutExtension(rel || filePath);
    return {
      sessionId: fallbackName,
      cwd: '',
      projectName: '未知项目',
      createdAt: '',
      threadName: '',
      displayName: fallbackName,
      updatedAt: '',
    };
  }
};

const walkJsonlFiles = (dir, base = dir, files = []) => {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonlFiles(full, base, files);
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      files.push(full);
    }
  }
  return files;
};

const normalizeSource = (source, index, cwd) => {
  const id = String(source?.id || source?.name || `source-${index + 1}`).trim();
  const name = String(source?.name || id).trim();
  const codexHome = resolveConfiguredPath(source?.codexHome, cwd);
  const sessionsPath = resolveConfiguredPath(source?.sessionsPath || source?.path, cwd);

  if (codexHome) {
    return {
      id,
      name,
      codexHome,
      roots: [
        {
          archive: false,
          archiveLabel: 'active',
          path: path.join(codexHome, 'sessions'),
        },
        {
          archive: true,
          archiveLabel: 'archived',
          path: path.join(codexHome, 'archived_sessions'),
        },
      ],
    };
  }

  if (sessionsPath) {
    return {
      id,
      name,
      roots: [
        {
          archive: false,
          archiveLabel: 'active',
          path: sessionsPath,
        },
      ],
    };
  }

  return null;
};

export const getSessionSources = (env = process.env, cwd = process.cwd()) => {
  const rawSources = stripWrappingQuotes(env.CODEX_SESSION_SOURCES);
  if (rawSources) {
    try {
      const parsed = JSON.parse(rawSources);
      if (Array.isArray(parsed)) {
        const sources = parsed
          .map((source, index) => normalizeSource(source, index, cwd))
          .filter(Boolean);
        if (sources.length) return sources;
      }
    } catch (err) {
      console.warn('Failed to parse CODEX_SESSION_SOURCES; falling back to single root', err);
    }
  }

  const fallbackRoot = resolveConfiguredPath(
    env.SESSIONS_ROOT_PATH || path.join(cwd, 'sessions'),
    cwd,
  );

  return [
    {
      id: 'default',
      name: '默认会话',
      roots: [
        {
          archive: false,
          archiveLabel: 'active',
          path: fallbackRoot,
        },
      ],
    },
  ];
};

export const buildSessionIndex = (sources) => {
  const files = [];
  for (const source of sources) {
    const sessionIndex = readSessionIndex(source.codexHome);
    const appThreadIndex = readAppThreadIndex(source.codexHome);
    for (const root of source.roots || []) {
      const rootPath = root.path;
      for (const filePath of walkJsonlFiles(rootPath).sort()) {
        const rel = jsonlRelativePath(rootPath, filePath);
        files.push({
          rel,
          archive: Boolean(root.archive),
          archiveLabel: root.archiveLabel,
          fullPath: filePath,
          url: fileUrl(source.id, root.archiveLabel, rel),
          source: {
            id: source.id,
            name: source.name,
            ...(source.codexHome ? { codexHome: source.codexHome } : {}),
            sessionsRoot: rootPath,
          },
          ...readSessionFileSummary(filePath, rel, sessionIndex, appThreadIndex),
        });
      }
    }
  }
  return files;
};

export const resolveSessionFilePath = (sources, sourceId, archiveLabel, rel) => {
  const source = sources.find((item) => item.id === sourceId);
  if (!source) return null;

  const root = (source.roots || []).find((item) => item.archiveLabel === archiveLabel);
  if (!root) return null;

  const rootPath = path.resolve(root.path);
  const fullPath = path.resolve(rootPath, rel);
  const relative = path.relative(rootPath, fullPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (!fullPath.endsWith('.jsonl')) return null;
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
};

export const deleteSessionFile = (sources, sourceId, archiveLabel, rel) => {
  const source = sources.find((item) => item.id === sourceId);
  const fullPath = resolveSessionFilePath(sources, sourceId, archiveLabel, rel);
  if (!fullPath) {
    return {
      deleted: false,
      reason: 'not_found',
    };
  }

  const summary = readSessionFileSummary(fullPath, rel, new Map());
  fs.unlinkSync(fullPath);
  const result = {
    deleted: true,
    fullPath,
  };

  if (source?.codexHome) {
    result.appCleanup = cleanupCodexAppState(source.codexHome, {
      deletedSessionIds: [summary.sessionId],
      touchedProjectPaths: [summary.cwd],
    });
  }

  return result;
};
