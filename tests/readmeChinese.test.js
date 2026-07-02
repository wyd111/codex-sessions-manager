import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('..', import.meta.url);
const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
const zhPath = new URL('../README.zh-CN.md', import.meta.url);

describe('Chinese README', () => {
  it('is linked from the English README', () => {
    expect(readme).toContain('[简体中文](README.zh-CN.md)');
  });

  it('documents Windows deployment, multi-source setup, and local-only privacy in Chinese', () => {
    expect(existsSync(zhPath)).toBe(true);
    const zhReadme = readFileSync(zhPath, 'utf8');

    expect(zhReadme).toContain('# Codex 会话管理器');
    expect(zhReadme).toContain('### Windows 本机部署');
    expect(zhReadme).toContain('pnpm run dev -- --host 127.0.0.1 --port 5172');
    expect(zhReadme).toContain('$env:CODEX_SESSION_SOURCES=');
    expect(zhReadme).toContain('多来源本地会话管理');
    expect(zhReadme).toContain('完全在本机运行');
  });
});
