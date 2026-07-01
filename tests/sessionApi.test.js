import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadSessions } from '../src/utils/sessionApi.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadSessions', () => {
  it('keeps source and file metadata from the session index entry', async () => {
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
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [indexEntry],
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '{"type":"session_meta","payload":{"id":"session-1"}}',
      });
    vi.stubGlobal('fetch', fetchMock);

    await expect(loadSessions()).resolves.toEqual([
      {
        path: '2026/07/rollout.jsonl',
        raw: '{"type":"session_meta","payload":{"id":"session-1"}}',
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
  });
});
