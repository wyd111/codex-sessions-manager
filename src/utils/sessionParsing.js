export const NO_REQUEST_TEXT = 'No user request found';
export const MAX_GAP_MS = 25 * 60 * 1000; // cap normal inactivity gaps at 25 minutes
export const INTERRUPT_GAP_MS = 60 * 60 * 1000; // treat gaps over an hour as session breaks

const isInstructionText = (text) => {
  if (typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.startsWith('<') && trimmed.endsWith('>');
};

const getFirstUserRequest = (entries) => {
  for (const entry of entries) {
    const content = entry?.payload?.content;
    if (!Array.isArray(content)) continue;
    for (const piece of content) {
      if (piece?.type === 'input_text' && typeof piece.text === 'string') {
        const trimmed = piece.text.trim();
        const isAgentsPreface = trimmed.startsWith('# AGENTS.md instructions for');
        if (!isInstructionText(trimmed) && !isAgentsPreface) {
          return trimmed;
        }
      }
    }
  }
  return NO_REQUEST_TEXT;
};

export const formatDate = (value, locale = 'zh-CN') => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

export const formatDuration = (ms) => {
  if (!ms || ms < 1000) return '0秒';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (hours) parts.push(`${hours}小时`);
  if (minutes) parts.push(`${minutes}分钟`);
  if (!hours && !minutes && seconds) parts.push(`${seconds}秒`);
  return parts.join(' ') || '0秒';
};

const projectNameFromCwd = (cwd) => {
  const cwdParts = String(cwd || '').split(/[\\/]/).filter(Boolean);
  return cwdParts[cwdParts.length - 1] || '未知项目';
};

const safeFileName = (value) => String(value || '').split(/[\\/]/).pop() || 'session.jsonl';

const fallbackDisplayName = (file, sessionId) => {
  const fileName = safeFileName(file.path || file.rel || file.fullPath);
  return (
    file.displayName ||
    file.threadName ||
    (fileName ? fileName.replace(/\.jsonl$/i, '') : '') ||
    sessionId ||
    NO_REQUEST_TEXT
  );
};

// JSONL files here are pretty-printed blocks, so we collect full JSON objects
// by tracking brace depth (ignoring braces inside strings) before parsing.
export const parseJsonBlocks = (raw) => {
  const blocks = [];
  let buffer = [];
  let depth = 0;
  let inString = false;
  let escaping = false;

  const flushBuffer = () => {
    if (!buffer.length) return;
    const block = buffer.join('\n').trim();
    buffer = [];
    if (!block) return;
    try {
      blocks.push(JSON.parse(block));
    } catch (err) {
      console.warn('Skipped malformed JSON block:', err);
    }
  };

  const updateDepth = (line) => {
    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];

      if (inString) {
        if (escaping) {
          escaping = false;
        } else if (char === '\\') {
          escaping = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
      }
    }
  };

  for (const line of (raw || '').split('\n')) {
    if (!buffer.length && !line.trim()) {
      continue;
    }

    updateDepth(line);
    buffer.push(line);

    if (depth === 0 && !inString) {
      flushBuffer();
    }
  }

  if (depth === 0 && !inString) {
    flushBuffer();
  }

  return blocks;
};

const collectMessages = (entries) => {
  return entries
    .filter((entry) => entry?.payload?.type === 'message')
    .map((entry) => {
      const role = entry?.payload?.role || 'unknown';
      const pieces = entry?.payload?.content || [];
      const text = pieces
        .map((piece) => {
          if (typeof piece?.text === 'string' && piece.text.trim()) {
            return piece.text.trim();
          }
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
      return {
        role,
        text: text || '[no text]',
        timestamp: entry?.timestamp,
      };
    })
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant');
};

const computeActiveDuration = (entries) => {
  let total = 0;
  let lastTs = null;

  for (const entry of entries) {
    const ts = new Date(entry?.timestamp || 0).getTime();
    if (Number.isNaN(ts)) continue;

    if (lastTs !== null) {
      const diff = ts - lastTs;
      if (diff > 0) {
        if (diff > INTERRUPT_GAP_MS) {
          // Very large gaps indicate the user left entirely; skip counting them.
        } else {
          total += Math.min(diff, MAX_GAP_MS);
        }
      }
    }

    lastTs = ts;
  }

  return total;
};

const parseSingleSession = (file) => {
  const { raw } = file;
  const hasTranscript = Boolean(raw);
  const sessionPath = file.path || file.relativePath || file.rel || '';
  const entries = hasTranscript ? parseJsonBlocks(raw) : [];
  const messages = collectMessages(entries);
  const userCommandCount = hasTranscript
    ? messages.filter((msg) => msg.role === 'user').length
    : null;
  const activeMs = hasTranscript ? computeActiveDuration(entries) : null;

  const first = entries[0] || {};
  const last = entries[entries.length - 1] || {};

  const cwd = first?.payload?.cwd || file.cwd || '';
  const projectName = file.projectName || projectNameFromCwd(cwd);
  const archiveLabel = file.archiveLabel || (file.archive ? 'archived' : 'active');
  const source = file.source || {
    id: file.sourceId,
    name: file.sourceName,
    codexHome: file.codexHome,
    sessionsRoot: file.sessionsRoot,
  };
  const sourceId = source.id || 'default';
  const sessionId = first?.payload?.id || file.sessionId || 'unknown-id';
  const displayName = fallbackDisplayName(file, sessionId);
  const transcriptFirstRequest = getFirstUserRequest(entries);
  const firstRequest = transcriptFirstRequest === NO_REQUEST_TEXT
    ? displayName
    : transcriptFirstRequest;
  const createdAt = first?.timestamp || file.createdAt || '';
  const lastMessageAt = file.updatedAt || last?.timestamp || createdAt;
  const relativePath = sessionPath.replace(/^(\.\.\/)+sessions\//, '');

  return {
    id: `${sourceId}:${archiveLabel}:${relativePath || sessionId}`,
    fileName: safeFileName(sessionPath || file.fullPath),
    projectName,
    createdAt,
    lastMessageAt,
    updatedAt: file.updatedAt || lastMessageAt,
    firstRequest,
    displayName,
    threadName: file.threadName || '',
    entryCount: hasTranscript ? messages.length : null,
    messages,
    userCommandCount,
    sessionId,
    cwd,
    relativePath,
    fullPath: file.fullPath || sessionPath.replace('../', ''),
    url: file.url || '',
    archive: Boolean(file.archive),
    archiveLabel,
    sourceId,
    sourceName: source.name || sourceId,
    codexHome: source.codexHome || '',
    sessionsRoot: source.sessionsRoot || '',
    activeMs,
    activeDuration: hasTranscript ? formatDuration(activeMs) : '',
    hasTranscript,
  };
};

export const parseSessions = (rawFiles) =>
  (rawFiles || [])
    .map((file) => parseSingleSession(file))
    .sort((a, b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt));
