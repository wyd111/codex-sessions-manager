export const fetchSessionIndex = async () => {
  try {
    const res = await fetch('/__sessions_index');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Failed to fetch sessions index', err);
    return [];
  }
};

export const loadSessions = async () => {
  const index = await fetchSessionIndex();
  return (index || []).map(({ rel, ...item }) => ({
    path: rel,
    ...item,
  }));
};

export const loadSessionRaw = async (session) => {
  if (!session?.url) {
    throw new Error('缺少会话文件 URL。');
  }

  const separator = session.url.includes('?') ? '&' : '?';
  const res = await fetch(`${session.url}${separator}t=${Date.now()}`);
  if (!res.ok) {
    throw new Error(`加载会话详情失败（${res.status}）`);
  }

  return res.text();
};

const deleteSessionFile = async (session) => {
  if (!session?.url) {
    throw new Error('缺少会话文件 URL。');
  }

  const res = await fetch(session.url, { method: 'DELETE' });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `删除会话失败（${res.status}）`);
  }

  try {
    return await res.json();
  } catch {
    return { deleted: true };
  }
};

export const deleteSessions = async (sessions) => {
  const results = await Promise.allSettled((sessions || []).map(deleteSessionFile));
  const failed = [];
  let deleted = 0;
  const appCleanup = {
    threadsDeleted: 0,
    sessionIndexRemoved: 0,
    projectRootsRemoved: [],
    warnings: [],
  };

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      deleted += 1;
      const cleanup = result.value?.appCleanup;
      if (cleanup) {
        appCleanup.threadsDeleted += cleanup.threadsDeleted || 0;
        appCleanup.sessionIndexRemoved += cleanup.sessionIndexRemoved || 0;
        appCleanup.projectRootsRemoved.push(...(cleanup.projectRootsRemoved || []));
        appCleanup.warnings.push(...(cleanup.warnings || []));
      }
      return;
    }

    failed.push({
      session: sessions[index],
      message: result.reason?.message || '删除失败',
    });
  });

  return {
    deleted,
    appCleanup: {
      ...appCleanup,
      projectRootsRemoved: Array.from(new Set(appCleanup.projectRootsRemoved)),
      warnings: Array.from(new Set(appCleanup.warnings)),
    },
    failed,
  };
};
