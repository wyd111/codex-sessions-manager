import { describe, expect, it } from 'vitest';
import {
  ALL_SOURCES_VALUE,
  filterSessionsBySource,
  sourceOptionsFromSessions,
} from '../src/utils/sessionSources.js';

describe('sourceOptionsFromSessions', () => {
  it('returns All sources plus unique source options sorted by name', () => {
    const sessions = [
      { sourceId: 'api', sourceName: 'Default API Key' },
      { sourceId: 'chatgpt', sourceName: 'ChatGPT Login' },
      { sourceId: 'api', sourceName: 'Default API Key' },
    ];

    expect(sourceOptionsFromSessions(sessions)).toEqual([
      { title: 'All sources', value: ALL_SOURCES_VALUE },
      { title: 'ChatGPT Login', value: 'chatgpt' },
      { title: 'Default API Key', value: 'api' },
    ]);
  });
});

describe('filterSessionsBySource', () => {
  it('keeps all sessions for All sources and filters exact source ids otherwise', () => {
    const sessions = [
      { id: 'one', sourceId: 'api' },
      { id: 'two', sourceId: 'chatgpt' },
    ];

    expect(filterSessionsBySource(sessions, ALL_SOURCES_VALUE)).toEqual(sessions);
    expect(filterSessionsBySource(sessions, 'chatgpt')).toEqual([{ id: 'two', sourceId: 'chatgpt' }]);
  });
});
