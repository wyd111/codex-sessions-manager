import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildSessionIndex,
  deleteSessionFile,
  getSessionSources,
  resolveSessionFilePath,
} from '../server/sessionSources.js';

const tempDirs = [];

const makeTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sessions-test-'));
  tempDirs.push(dir);
  return dir;
};

const writeJsonl = (filePath, overrides = {}) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      timestamp: overrides.timestamp || '2026-07-01T00:00:00.000Z',
      type: 'session_meta',
      payload: {
        id: overrides.id || '019f1-test-session',
        cwd: overrides.cwd || 'E:\\AI\\Project',
      },
    }),
  );
};

const writeSessionIndex = (codexHome, entries) => {
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(
    path.join(codexHome, 'session_index.jsonl'),
    entries.map((entry) => JSON.stringify(entry)).join('\n'),
  );
};

const writeThreadStateDb = (codexHome, rows) => {
  const dbPath = path.join(codexHome, 'state_5.sqlite');
  const script = `
import json
import sqlite3
import sys
db_path = sys.argv[1]
rows = json.loads(sys.argv[2])
conn = sqlite3.connect(db_path)
conn.execute('CREATE TABLE threads (id TEXT PRIMARY KEY, title TEXT, updated_at TEXT, updated_at_ms TEXT, cwd TEXT)')
conn.executemany(
    'INSERT INTO threads (id, title, updated_at, updated_at_ms, cwd) VALUES (?, ?, ?, ?, ?)',
    [(row['id'], row['title'], row.get('updated_at'), row.get('updated_at_ms'), row.get('cwd')) for row in rows],
)
conn.commit()
conn.close()
`;
  const child = spawnSync('python', ['-c', script, dbPath, JSON.stringify(rows)], {
    encoding: 'utf8',
  });
  if (child.status !== 0) {
    throw new Error(child.stderr || child.stdout);
  }
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('getSessionSources', () => {
  it('normalizes CODEX_SESSION_SOURCES codexHome and direct sessionsPath entries', () => {
    const root = makeTempDir();
    const codexHome = path.join(root, 'codex-api');
    const directSessions = path.join(root, 'mounted-sessions');

    const sources = getSessionSources(
      {
        CODEX_SESSION_SOURCES: JSON.stringify([
          { id: 'api', name: 'API Key', codexHome },
          { id: 'legacy', name: 'Mounted', sessionsPath: directSessions },
        ]),
      },
      root,
    );

    expect(sources).toEqual([
      {
        id: 'api',
        name: 'API Key',
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
      },
      {
        id: 'legacy',
        name: 'Mounted',
        roots: [
          {
            archive: false,
            archiveLabel: 'active',
            path: directSessions,
          },
        ],
      },
    ]);
  });

  it('falls back to SESSIONS_ROOT_PATH and then local sessions directory', () => {
    const root = makeTempDir();
    const sessionsRoot = path.join(root, 'sessions-from-env');

    expect(getSessionSources({ SESSIONS_ROOT_PATH: sessionsRoot }, root)).toEqual([
      {
        id: 'default',
        name: '默认会话',
        roots: [
          {
            archive: false,
            archiveLabel: 'active',
            path: sessionsRoot,
          },
        ],
      },
    ]);

    expect(getSessionSources({}, root)).toEqual([
      {
        id: 'default',
        name: '默认会话',
        roots: [
          {
            archive: false,
            archiveLabel: 'active',
            path: path.join(root, 'sessions'),
          },
        ],
      },
    ]);
  });
});

describe('buildSessionIndex', () => {
  it('indexes active and archived JSONL files with source metadata and safe URLs', () => {
    const root = makeTempDir();
    const codexHome = path.join(root, 'codex-api');
    const activeFile = path.join(codexHome, 'sessions', '2026', '07', 'rollout-active.jsonl');
    const archivedFile = path.join(codexHome, 'archived_sessions', '2026', '06', 'rollout-old.jsonl');
    writeJsonl(activeFile);
    writeJsonl(archivedFile);
    writeSessionIndex(codexHome, [
      {
        id: '019f1-test-session',
        thread_name: '实现项目列表界面',
        updated_at: '2026-07-01T02:30:00.000Z',
      },
    ]);

    const [source] = getSessionSources(
      {
        CODEX_SESSION_SOURCES: JSON.stringify([
          { id: 'api/home', name: 'API Key', codexHome },
        ]),
      },
      root,
    );

    const index = buildSessionIndex([source]);

    expect(index).toHaveLength(2);
    expect(index).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rel: '2026/07/rollout-active.jsonl',
          archive: false,
          archiveLabel: 'active',
          fullPath: activeFile,
          url: '/__session_file/api%2Fhome/active/2026%2F07%2Frollout-active.jsonl',
          source: expect.objectContaining({
            id: 'api/home',
            name: 'API Key',
            codexHome,
            sessionsRoot: path.join(codexHome, 'sessions'),
          }),
          sessionId: '019f1-test-session',
          cwd: 'E:\\AI\\Project',
          projectName: 'Project',
          threadName: '实现项目列表界面',
          displayName: '实现项目列表界面',
          updatedAt: '2026-07-01T02:30:00.000Z',
        }),
        expect.objectContaining({
          rel: '2026/06/rollout-old.jsonl',
          archive: true,
          archiveLabel: 'archived',
          fullPath: archivedFile,
          url: '/__session_file/api%2Fhome/archived/2026%2F06%2Frollout-old.jsonl',
          source: expect.objectContaining({
            id: 'api/home',
            name: 'API Key',
            codexHome,
            sessionsRoot: path.join(codexHome, 'archived_sessions'),
          }),
        }),
      ]),
    );
  });

  it('uses Codex App thread titles when session_index has no matching name', () => {
    const root = makeTempDir();
    const codexHome = path.join(root, 'codex-api');
    const activeFile = path.join(codexHome, 'sessions', '2026', '07', 'rollout-active.jsonl');
    writeJsonl(activeFile, {
      id: 'thread-from-sqlite',
      cwd: 'E:\\AI\\SqliteProject',
    });
    writeThreadStateDb(codexHome, [
      {
        id: 'thread-from-sqlite',
        title: '来自 Codex App 的标题',
        updated_at: '2026-07-01T08:00:00.000Z',
        updated_at_ms: '1782892800000',
        cwd: '\\\\?\\E:\\AI\\SqliteProject',
      },
    ]);

    const [source] = getSessionSources(
      {
        CODEX_SESSION_SOURCES: JSON.stringify([{ id: 'api', name: 'API Key', codexHome }]),
      },
      root,
    );

    expect(buildSessionIndex([source])[0]).toEqual(
      expect.objectContaining({
        sessionId: 'thread-from-sqlite',
        threadName: '来自 Codex App 的标题',
        displayName: '来自 Codex App 的标题',
      }),
    );
  });
});

describe('resolveSessionFilePath', () => {
  it('resolves known source files and rejects path traversal', () => {
    const root = makeTempDir();
    const codexHome = path.join(root, 'codex-api');
    const activeFile = path.join(codexHome, 'sessions', 'rollout-active.jsonl');
    writeJsonl(activeFile);

    const sources = getSessionSources(
      {
        CODEX_SESSION_SOURCES: JSON.stringify([{ id: 'api', name: 'API Key', codexHome }]),
      },
      root,
    );

    expect(resolveSessionFilePath(sources, 'api', 'active', 'rollout-active.jsonl')).toBe(
      activeFile,
    );
    expect(resolveSessionFilePath(sources, 'api', 'active', '../auth.json')).toBeNull();
    expect(resolveSessionFilePath(sources, 'missing', 'active', 'rollout-active.jsonl')).toBeNull();
  });
});

describe('deleteSessionFile', () => {
  it('deletes an indexed JSONL session file and rejects traversal', () => {
    const root = makeTempDir();
    const codexHome = path.join(root, 'codex-api');
    const activeFile = path.join(codexHome, 'sessions', 'rollout-active.jsonl');
    writeJsonl(activeFile);

    const sources = getSessionSources(
      {
        CODEX_SESSION_SOURCES: JSON.stringify([{ id: 'api', name: 'API Key', codexHome }]),
      },
      root,
    );

    expect(deleteSessionFile(sources, 'api', 'active', '../auth.json')).toEqual({
      deleted: false,
      reason: 'not_found',
    });
    expect(fs.existsSync(activeFile)).toBe(true);

    expect(deleteSessionFile(sources, 'api', 'active', 'rollout-active.jsonl')).toEqual(
      expect.objectContaining({
        deleted: true,
        fullPath: activeFile,
      }),
    );
    expect(fs.existsSync(activeFile)).toBe(false);
  });

  it('synchronously cleans Codex App state for the deleted session project', () => {
    const root = makeTempDir();
    const codexHome = path.join(root, 'codex-api');
    const projectPath = path.join(root, 'Project To Remove');
    const activeFile = path.join(codexHome, 'sessions', 'rollout-active.jsonl');
    writeJsonl(activeFile, {
      id: 'deleted-session',
      cwd: projectPath,
    });
    fs.writeFileSync(
      path.join(codexHome, '.codex-global-state.json'),
      JSON.stringify(
        {
          'electron-saved-workspace-roots': [projectPath],
          'project-order': [projectPath],
          'active-workspace-roots': [projectPath],
          'electron-persisted-atom-state': {
            [`sidebar-project-expanded-v1-codex:${projectPath}`]: true,
          },
        },
        null,
        2,
      ),
    );

    const sources = getSessionSources(
      {
        CODEX_SESSION_SOURCES: JSON.stringify([{ id: 'api', name: 'API Key', codexHome }]),
      },
      root,
    );

    const result = deleteSessionFile(sources, 'api', 'active', 'rollout-active.jsonl');

    expect(result).toMatchObject({
      deleted: true,
      appCleanup: {
        projectRootsRemoved: [projectPath],
      },
    });

    const state = JSON.parse(
      fs.readFileSync(path.join(codexHome, '.codex-global-state.json'), 'utf8'),
    );
    expect(state['electron-saved-workspace-roots']).toEqual([]);
    expect(state['project-order']).toEqual([]);
    expect(state['active-workspace-roots']).toEqual([]);
    expect(state['electron-persisted-atom-state']).toEqual({});
  });
});
