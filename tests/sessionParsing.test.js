import { describe, expect, it } from 'vitest';
import { parseJsonBlocks, parseSessions } from '../src/utils/sessionParsing.js';

const sessionRaw = [
  JSON.stringify({
    timestamp: '2026-07-01T01:00:00.000Z',
    type: 'session_meta',
    payload: {
      id: '019f1-session',
      cwd: 'E:\\AI\\Project',
    },
  }),
  JSON.stringify({
    timestamp: '2026-07-01T01:00:05.000Z',
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'Build multi-source session support' }],
    },
  }),
  JSON.stringify({
    timestamp: '2026-07-01T01:00:15.000Z',
    type: 'response_item',
    payload: {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text: 'Working on it.' }],
    },
  }),
].join('\n');

describe('parseSessions', () => {
  it('builds a list summary from lightweight index metadata without raw transcript text', () => {
    const [session] = parseSessions([
      {
        path: '2026/07/rollout.jsonl',
        archive: false,
        archiveLabel: 'active',
        fullPath: 'C:\\Users\\15693\\.codex\\sessions\\2026\\07\\rollout.jsonl',
        url: '/__session_file/api/active/2026%2F07%2Frollout.jsonl',
        source: {
          id: 'api',
          name: 'Default API Key',
          codexHome: 'C:\\Users\\15693\\.codex',
          sessionsRoot: 'C:\\Users\\15693\\.codex\\sessions',
        },
        sessionId: '019f1-session',
        cwd: 'E:\\AI\\Project',
        projectName: 'Project',
        threadName: '实现项目列表界面',
        displayName: '实现项目列表界面',
        createdAt: '2026-07-01T01:00:00.000Z',
        updatedAt: '2026-07-01T02:30:00.000Z',
      },
    ]);

    expect(session).toMatchObject({
      id: 'api:active:2026/07/rollout.jsonl',
      fileName: 'rollout.jsonl',
      projectName: 'Project',
      sessionId: '019f1-session',
      cwd: 'E:\\AI\\Project',
      displayName: '实现项目列表界面',
      threadName: '实现项目列表界面',
      firstRequest: '实现项目列表界面',
      createdAt: '2026-07-01T01:00:00.000Z',
      lastMessageAt: '2026-07-01T02:30:00.000Z',
      entryCount: null,
      userCommandCount: null,
      activeMs: null,
      activeDuration: '',
      messages: [],
      hasTranscript: false,
    });
  });

  it('parses a transcript loaded for an existing list summary without requiring path again', () => {
    const [summary] = parseSessions([
      {
        path: '2026/07/rollout.jsonl',
        archive: false,
        archiveLabel: 'active',
        fullPath: 'C:\\Users\\15693\\.codex\\sessions\\2026\\07\\rollout.jsonl',
        url: '/__session_file/api/active/2026%2F07%2Frollout.jsonl',
        source: {
          id: 'api',
          name: 'Default API Key',
          codexHome: 'C:\\Users\\15693\\.codex',
          sessionsRoot: 'C:\\Users\\15693\\.codex\\sessions',
        },
        sessionId: '019f1-session',
        cwd: 'E:\\AI\\Project',
        projectName: 'Project',
        threadName: '实现项目列表界面',
        displayName: '实现项目列表界面',
        createdAt: '2026-07-01T01:00:00.000Z',
        updatedAt: '2026-07-01T02:30:00.000Z',
      },
    ]);

    const [detail] = parseSessions([{ ...summary, raw: sessionRaw }]);

    expect(detail).toMatchObject({
      id: 'api:active:2026/07/rollout.jsonl',
      relativePath: '2026/07/rollout.jsonl',
      sourceId: 'api',
      sourceName: 'Default API Key',
      codexHome: 'C:\\Users\\15693\\.codex',
      sessionsRoot: 'C:\\Users\\15693\\.codex\\sessions',
      firstRequest: 'Build multi-source session support',
      entryCount: 2,
      hasTranscript: true,
    });
  });

  it('carries source metadata and builds a source-scoped session id', () => {
    const [session] = parseSessions([
      {
        path: '2026/07/rollout.jsonl',
        raw: sessionRaw,
        archive: true,
        archiveLabel: 'archived',
        fullPath: 'C:\\Users\\15693\\.codex\\archived_sessions\\2026\\07\\rollout.jsonl',
        source: {
          id: 'api',
          name: 'Default API Key',
          codexHome: 'C:\\Users\\15693\\.codex',
          sessionsRoot: 'C:\\Users\\15693\\.codex\\archived_sessions',
        },
      },
    ]);

    expect(session).toMatchObject({
      id: 'api:archived:2026/07/rollout.jsonl',
      fileName: 'rollout.jsonl',
      projectName: 'Project',
      sessionId: '019f1-session',
      relativePath: '2026/07/rollout.jsonl',
      fullPath: 'C:\\Users\\15693\\.codex\\archived_sessions\\2026\\07\\rollout.jsonl',
      archive: true,
      archiveLabel: 'archived',
      sourceId: 'api',
      sourceName: 'Default API Key',
      codexHome: 'C:\\Users\\15693\\.codex',
      sessionsRoot: 'C:\\Users\\15693\\.codex\\archived_sessions',
      firstRequest: 'Build multi-source session support',
      entryCount: 2,
    });
  });
});

describe('parseJsonBlocks', () => {
  it('parses very large single-line JSON blocks without overflowing the stack', () => {
    const raw = JSON.stringify({
      timestamp: '2026-07-01T01:00:00.000Z',
      type: 'session_meta',
      payload: {
        id: '019f1-large',
        cwd: 'E:\\AI\\Project',
        base_instructions: 'x'.repeat(8 * 1024 * 1024),
      },
    });

    const [block] = parseJsonBlocks(raw);

    expect(block.payload.id).toBe('019f1-large');
    expect(block.payload.base_instructions).toHaveLength(8 * 1024 * 1024);
  });
});
