import { describe, expect, it } from 'vitest';
import {
  buildNewSessionCommand,
  buildRemoveCommand,
  buildResumeCommand,
} from '../src/utils/sessionCommands.js';

describe('session command helpers', () => {
  const sourceSession = {
    codexHome: 'C:\\Users\\15693\\.codex',
    cwd: 'E:\\AI\\Project One',
    sessionId: '019f1-session',
    fullPath: 'C:\\Users\\15693\\.codex\\sessions\\2026\\07\\rollout.jsonl',
  };

  it('builds PowerShell-friendly resume commands with CODEX_HOME for sourced sessions', () => {
    expect(buildResumeCommand(sourceSession)).toBe(
      '$env:CODEX_HOME="C:\\Users\\15693\\.codex"; Set-Location "E:\\AI\\Project One"; codex resume 019f1-session',
    );
  });

  it('falls back to a legacy resume command when codexHome is missing', () => {
    expect(
      buildResumeCommand({
        cwd: '/home/wyd/project',
        sessionId: '019f1-session',
      }),
    ).toBe('cd /home/wyd/project && codex resume 019f1-session');
  });

  it('builds new-session commands with the matching CODEX_HOME', () => {
    expect(buildNewSessionCommand(sourceSession)).toBe(
      '$env:CODEX_HOME="C:\\Users\\15693\\.codex"; Set-Location "E:\\AI\\Project One"; codex',
    );
  });

  it('builds remove commands from the full file path', () => {
    expect(buildRemoveCommand(sourceSession)).toBe(
      'Remove-Item -LiteralPath "C:\\Users\\15693\\.codex\\sessions\\2026\\07\\rollout.jsonl"',
    );
  });
});
