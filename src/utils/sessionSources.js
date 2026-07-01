export const ALL_SOURCES_VALUE = '__all__';

export const sourceOptionsFromSessions = (sessions) => {
  const byId = new Map();
  for (const session of sessions || []) {
    const id = session.sourceId || 'default';
    const name = session.sourceName || id;
    if (!byId.has(id)) {
      byId.set(id, { title: name, value: id });
    }
  }

  return [
    { title: 'All sources', value: ALL_SOURCES_VALUE },
    ...Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title)),
  ];
};

export const filterSessionsBySource = (sessions, selectedSource) => {
  if (!selectedSource || selectedSource === ALL_SOURCES_VALUE) return sessions;
  return (sessions || []).filter((session) => session.sourceId === selectedSource);
};
