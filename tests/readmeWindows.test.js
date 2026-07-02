import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

describe('README Windows deployment docs', () => {
  it('documents direct Windows local deployment separate from WSL/Docker', () => {
    expect(readme).toContain('### Windows local deployment');
    expect(readme).toContain('pnpm install');
    expect(readme).toContain('pnpm run dev -- --host 127.0.0.1 --port 5172');
    expect(readme).toContain('$env:CODEX_SESSION_SOURCES=');
  });
});
