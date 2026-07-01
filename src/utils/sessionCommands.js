const powerShellQuote = (value) =>
  `"${String(value || '')
    .replace(/`/g, '``')
    .replace(/"/g, '`"')}"`;

export const buildResumeCommand = (session) => {
  if (session?.codexHome) {
    return [
      `$env:CODEX_HOME=${powerShellQuote(session.codexHome)}`,
      `Set-Location ${powerShellQuote(session.cwd || '.')}`,
      `codex resume ${session.sessionId}`,
    ].join('; ');
  }

  return `cd ${session.cwd} && codex resume ${session.sessionId}`;
};

export const buildNewSessionCommand = (session) => {
  if (session?.codexHome) {
    return [
      `$env:CODEX_HOME=${powerShellQuote(session.codexHome)}`,
      `Set-Location ${powerShellQuote(session.cwd || '.')}`,
      'codex',
    ].join('; ');
  }

  return `cd ${session.cwd} && codex`;
};

export const buildRemoveCommand = (session) => {
  if (session?.fullPath) {
    return `Remove-Item -LiteralPath ${powerShellQuote(session.fullPath)}`;
  }

  const rel = (session?.relativePath || '').replace(/^\/+/, '');
  return `rm ${rel}`;
};
