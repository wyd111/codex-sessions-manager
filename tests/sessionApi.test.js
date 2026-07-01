import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteSessions, loadSessionRaw, loadSessions } from '../src/utils/sessionApi.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSessions', () => {
  it('loads lightweight index metadata without fetching every session transcript', async () => {
    const indexEntry = {
      rel: '2026/07/rollout.jsonl',
      archive: true,
      archiveLabel: 'archived',
      fullPath: 'C:\\Users\\15693\\.codex\\archived_sessions\\2026\\07\\rollout.jsonl',
      url: '/__session_file/api/archived/2026%2F07%2Frollout.jsonl',
      source: {
        id: 'api',
        name: 'Default API Key',
        codexHome: 'C:\\Users\\15693\\.codex',
        sessionsRoot: 'C:\\Users\\15693\\.codex\\archived_sessions',
      },
      sessionId: 'session-1',
      cwd: 'E:\\AI\\Project',
      projectName: 'Project',
      threadName: '实现项目列表界面',
      displayName: '实现项目列表界面',
      updatedAt: '2026-07-01T02:30:00.000Z',
    };

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [indexEntry],
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadSessions()).resolves.toEqual([
      {
        path: '2026/07/rollout.jsonl',
        archive: true,
        archiveLabel: 'archived',
        fullPath: 'C:\\Users\\15693\\.codex\\archived_sessions\\2026\\07\\rollout.jsonl',
        url: '/__session_file/api/archived/2026%2F07%2Frollout.jsonl',
        source: {
          id: 'api',
          name: 'Default API Key',
          codexHome: 'C:\\Users\\15693\\.codex',
          sessionsRoot: 'C:\\Users\\15693\\.codex\\archived_sessions',
        },
        sessionId: 'session-1',
        cwd: 'E:\\AI\\Project',
        projectName: 'Project',
        threadName: '实现项目列表界面',
        displayName: '实现项目列表界面',
        updatedAt: '2026-07-01T02:30:00.000Z',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('loads a single transcript on demand', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      text: async () => '{"type":"session_meta","payload":{"id":"session-1"}}',
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      loadSessionRaw({
        url: '/__session_file/api/active/2026%2F07%2Frollout.jsonl',
      }),
    ).resolves.toBe('{"type":"session_meta","payload":{"id":"session-1"}}');
  });
});

describe('deleteSessions', () => {
  it('deletes selected sessions through their safe local URLs and reports failures', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          deleted: true,
          appCleanup: {
            threadsDeleted: 1,
            sessionIndexRemoved: 1,
            projectRootsRemoved: ['E:\\AI\\Project'],
            warnings: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Session file not found',
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      deleteSessions([
        {
          id: 'one',
          displayName: '可删除会话',
          url: '/__session_file/api/active/one.jsonl',
        },
        {
          id: 'two',
          displayName: '不存在会话',
          url: '/__session_file/api/active/two.jsonl',
        },
      ]),
    ).resolves.toEqual({
      deleted: 1,
      appCleanup: {
        threadsDeleted: 1,
        sessionIndexRemoved: 1,
        projectRootsRemoved: ['E:\\AI\\Project'],
        warnings: [],
      },
      failed: [
        {
          session: expect.objectContaining({ id: 'two' }),
          message: 'Session file not found',
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith('/__session_file/api/active/one.jsonl', {
      method: 'DELETE',
    });
    expect(fetchMock).toHaveBeenCalledWith('/__session_file/api/active/two.jsonl', {
      method: 'DELETE',
    });
  });
});
