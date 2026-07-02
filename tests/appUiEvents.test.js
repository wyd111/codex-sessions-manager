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
    expect(appVue).toContain("tx('command.title')");
    expect(appVue).toContain('commandDialogCommand');
    expect(appVue).toContain("tx('actions.copyCommand')");
  });

  it('falls back when navigator clipboard write is denied', () => {
    expect(appVue).toContain("document.execCommand('copy')");
    expect(appVue).toContain('copy-fallback');
  });

  it('uses a single-session title for one selected deletion', () => {
    expect(appVue).toContain("selectedSessions.length === 1 ? tx('delete.singleTitle') : tx('delete.bulkTitle')");
  });

  it('passes language switching props into the header', () => {
    expect(appVue).toContain('v-model:language="languageModel"');
    expect(appVue).toContain(':language-options="LANGUAGE_OPTIONS"');
    expect(appVue).toContain(':labels="headerLabels"');
  });
});
