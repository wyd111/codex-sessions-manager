import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanupCodexAppState } from '../server/codexAppCleanup.js';

const tempDirs = [];

const makeTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-app-cleanup-test-'));
  tempDirs.push(dir);
  return dir;
};

const writeSession = (filePath, { id, cwd }) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      timestamp: '2026-07-01T00:00:00.000Z',
      type: 'session_meta',
      payload: { id, cwd },
    }),
  );
};

const createStateDb = (dbPath, rows) => {
  const script = `
import json
import sqlite3
import sys
db_path = sys.argv[1]
rows = json.loads(sys.argv[2])
conn = sqlite3.connect(db_path)
conn.execute('CREATE TABLE threads (id TEXT PRIMARY KEY, rollout_path TEXT, cwd TEXT)')
conn.executemany(
    'INSERT INTO threads (id, rollout_path, cwd) VALUES (?, ?, ?)',
    [(row['id'], row['rolloutPath'], row['cwd']) for row in rows],
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

const readThreadIds = (dbPath) => {
  const script = `
import json
import sqlite3
import sys
conn = sqlite3.connect(sys.argv[1])
rows = conn.execute('SELECT id FROM threads ORDER BY id').fetchall()
conn.close()
print(json.dumps([{'id': row[0]} for row in rows]))
`;
  const child = spawnSync('python', ['-c', script, dbPath], { encoding: 'utf8' });
  if (child.status !== 0) {
    throw new Error(child.stderr || child.stdout);
  }
  return JSON.parse(child.stdout);
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('cleanupCodexAppState', () => {
  it('removes deleted thread metadata, stale session_index entries, and empty touched projects', () => {
    const codexHome = makeTempDir();
    const deleteProject = path.join(codexHome, 'DeleteProject');
    const keepProject = path.join(codexHome, 'KeepProject');
    const unrelatedEmptyProject = path.join(codexHome, 'UnrelatedEmptyProject');
    const keepSessionPath = path.join(codexHome, 'sessions', '2026', '07', 'keep.jsonl');
    const deletedSessionPath = path.join(codexHome, 'sessions', '2026', '07', 'deleted.jsonl');

    writeSession(keepSessionPath, {
      id: 'keep-session',
      cwd: keepProject,
    });
    fs.writeFileSync(
      path.join(codexHome, 'session_index.jsonl'),
      [
        JSON.stringify({ id: 'deleted-session', thread_name: '删除项目会话' }),
        JSON.stringify({ id: 'keep-session', thread_name: '保留项目会话' }),
        JSON.stringify({ id: 'orphan-but-not-deleted', thread_name: '不是本次删除的标题' }),
      ].join('\n'),
    );
    createStateDb(path.join(codexHome, 'state_5.sqlite'), [
      {
        id: 'deleted-session',
        rolloutPath: deletedSessionPath,
        cwd: `\\\\?\\${deleteProject}`,
      },
      {
        id: 'keep-session',
        rolloutPath: keepSessionPath,
        cwd: `\\\\?\\${keepProject}`,
      },
    ]);
    fs.writeFileSync(
      path.join(codexHome, '.codex-global-state.json'),
      JSON.stringify(
        {
          'electron-saved-workspace-roots': [
            deleteProject,
            keepProject,
            unrelatedEmptyProject,
          ],
          'project-order': [deleteProject, keepProject, unrelatedEmptyProject],
          'active-workspace-roots': [deleteProject],
          'electron-persisted-atom-state': {
            [`sidebar-project-expanded-v1-codex:${deleteProject}`]: true,
            [`sidebar-project-expanded-v1-codex:${keepProject}`]: true,
          },
        },
        null,
        2,
      ),
    );

    const result = cleanupCodexAppState(codexHome, {
      deletedSessionIds: ['deleted-session'],
      touchedProjectPaths: [deleteProject],
    });

    expect(result).toMatchObject({
      threadsDeleted: 1,
      sessionIndexRemoved: 1,
      projectRootsRemoved: [deleteProject],
      warnings: [],
    });

    expect(readThreadIds(path.join(codexHome, 'state_5.sqlite'))).toEqual([
      { id: 'keep-session' },
    ]);

    expect(fs.readFileSync(path.join(codexHome, 'session_index.jsonl'), 'utf8')).toBe(
      [
        JSON.stringify({ id: 'keep-session', thread_name: '保留项目会话' }),
        JSON.stringify({ id: 'orphan-but-not-deleted', thread_name: '不是本次删除的标题' }),
        '',
      ].join('\n'),
    );

    const state = JSON.parse(
      fs.readFileSync(path.join(codexHome, '.codex-global-state.json'), 'utf8'),
    );
    expect(state['electron-saved-workspace-roots']).toEqual([
      keepProject,
      unrelatedEmptyProject,
    ]);
    expect(state['project-order']).toEqual([keepProject, unrelatedEmptyProject]);
    expect(state['active-workspace-roots']).toEqual([]);
    expect(state['electron-persisted-atom-state']).toEqual({
      [`sidebar-project-expanded-v1-codex:${keepProject}`]: true,
    });
    expect(fs.existsSync(path.join(codexHome, '.codex-global-state.json.bak-session-manager'))).toBe(
      true,
    );
  });
});
