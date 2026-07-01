import fs from 'fs';
import path from 'path';

const stripWrappingQuotes = (value) =>
  String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');

const resolveConfiguredPath = (value, cwd) => {
  const cleaned = stripWrappingQuotes(value);
  if (!cleaned) return '';
  return path.isAbsolute(cleaned) ? path.normalize(cleaned) : path.resolve(cwd, cleaned);
};

const jsonlRelativePath = (root, filePath) =>
  path.relative(root, filePath).replace(/\\/g, '/');

const fileUrl = (sourceId, archiveLabel, rel) =>
  `/__session_file/${encodeURIComponent(sourceId)}/${archiveLabel}/${encodeURIComponent(rel)}`;

const walkJsonlFiles = (dir, base = dir, files = []) => {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJsonlFiles(full, base, files);
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      files.push(full);
    }
  }
  return files;
};

const normalizeSource = (source, index, cwd) => {
  const id = String(source?.id || source?.name || `source-${index + 1}`).trim();
  const name = String(source?.name || id).trim();
  const codexHome = resolveConfiguredPath(source?.codexHome, cwd);
  const sessionsPath = resolveConfiguredPath(source?.sessionsPath || source?.path, cwd);

  if (codexHome) {
    return {
      id,
      name,
      codexHome,
      roots: [
        {
          archive: false,
          archiveLabel: 'active',
          path: path.join(codexHome, 'sessions'),
        },
        {
          archive: true,
          archiveLabel: 'archived',
          path: path.join(codexHome, 'archived_sessions'),
        },
      ],
    };
  }

  if (sessionsPath) {
    return {
      id,
      name,
      roots: [
        {
          archive: false,
          archiveLabel: 'active',
          path: sessionsPath,
        },
      ],
    };
  }

  return null;
};

export const getSessionSources = (env = process.env, cwd = process.cwd()) => {
  const rawSources = stripWrappingQuotes(env.CODEX_SESSION_SOURCES);
  if (rawSources) {
    try {
      const parsed = JSON.parse(rawSources);
      if (Array.isArray(parsed)) {
        const sources = parsed
          .map((source, index) => normalizeSource(source, index, cwd))
          .filter(Boolean);
        if (sources.length) return sources;
      }
    } catch (err) {
      console.warn('Failed to parse CODEX_SESSION_SOURCES; falling back to single root', err);
    }
  }

  const fallbackRoot = resolveConfiguredPath(
    env.SESSIONS_ROOT_PATH || path.join(cwd, 'sessions'),
    cwd,
  );

  return [
    {
      id: 'default',
      name: 'Default sessions',
      roots: [
        {
          archive: false,
          archiveLabel: 'active',
          path: fallbackRoot,
        },
      ],
    },
  ];
};

export const buildSessionIndex = (sources) => {
  const files = [];
  for (const source of sources) {
    for (const root of source.roots || []) {
      const rootPath = root.path;
      for (const filePath of walkJsonlFiles(rootPath).sort()) {
        const rel = jsonlRelativePath(rootPath, filePath);
        files.push({
          rel,
          archive: Boolean(root.archive),
          archiveLabel: root.archiveLabel,
          fullPath: filePath,
          url: fileUrl(source.id, root.archiveLabel, rel),
          source: {
            id: source.id,
            name: source.name,
            ...(source.codexHome ? { codexHome: source.codexHome } : {}),
            sessionsRoot: rootPath,
          },
        });
      }
    }
  }
  return files;
};

export const resolveSessionFilePath = (sources, sourceId, archiveLabel, rel) => {
  const source = sources.find((item) => item.id === sourceId);
  if (!source) return null;

  const root = (source.roots || []).find((item) => item.archiveLabel === archiveLabel);
  if (!root) return null;

  const rootPath = path.resolve(root.path);
  const fullPath = path.resolve(rootPath, rel);
  const relative = path.relative(rootPath, fullPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  if (!fullPath.endsWith('.jsonl')) return null;
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
};
