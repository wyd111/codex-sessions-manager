import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_OPTIONS,
  getInitialLanguage,
  translate,
} from '../src/utils/i18n.js';

describe('i18n helpers', () => {
  it('exposes Chinese and English language options', () => {
    expect(LANGUAGE_OPTIONS).toEqual([
      { title: '简体中文', value: 'zh-CN' },
      { title: 'English', value: 'en-US' },
    ]);
  });

  it('translates core app labels in both languages', () => {
    expect(translate('zh-CN', 'app.title')).toBe('Codex 会话管理');
    expect(translate('en-US', 'app.title')).toBe('Codex Session Manager');
    expect(translate('zh-CN', 'actions.refresh')).toBe('刷新');
    expect(translate('en-US', 'actions.refresh')).toBe('Refresh');
  });

  it('falls back to the default language for unknown or unsupported language values', () => {
    expect(DEFAULT_LANGUAGE).toBe('zh-CN');
    expect(translate('fr-FR', 'actions.delete')).toBe('删除');
    expect(translate('en-US', 'missing.key')).toBe('missing.key');
  });

  it('loads a stored supported language and ignores unsupported stored values', () => {
    expect(getInitialLanguage({ getItem: () => 'en-US' })).toBe('en-US');
    expect(getInitialLanguage({ getItem: () => 'fr-FR' })).toBe(DEFAULT_LANGUAGE);
  });
});
