import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildSessionIndex,
  getSessionSources,
  resolveSessionFilePath,
} from '../server/sessionSources.js';

const tempDirs = [];

const makeTempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-sessions-test-'));
  tempDirs.push(dir);
  return dir;
};

const writeJsonl = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    JSON.stringify({
      timestamp: '2026-07-01T00:00:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f1-test-session',
        cwd: 'E:\\AI\\Project',
      },
    }),
  );
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
        name: 'Default sessions',
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
        name: 'Default sessions',
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
