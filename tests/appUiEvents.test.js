import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appVue = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');

describe('App UI action wiring', () => {
  it('wires session row actions to direct delete and resume command dialog', () => {
    expect(appVue).toContain('@show-resume="showResumeCommand"');
    expect(appVue).toContain('@delete-session="requestDeleteSessions([$event])"');
    expect(appVue).not.toContain('@copy-resume=');
    expect(appVue).not.toContain('@copy-remove=');
    expect(appVue).not.toContain('buildRemoveCommand');
  });

  it('shows a PowerShell command dialog for resume commands', () => {
    expect(appVue).toContain('PowerShell 恢复命令');
    expect(appVue).toContain('commandDialogCommand');
    expect(appVue).toContain('复制命令');
  });

  it('falls back when navigator clipboard write is denied', () => {
    expect(appVue).toContain("document.execCommand('copy')");
    expect(appVue).toContain('copy-fallback');
  });

  it('uses a single-session title for one selected deletion', () => {
    expect(appVue).toContain("selectedSessions.length === 1 ? '确认删除会话' : '确认批量删除'");
  });
});
