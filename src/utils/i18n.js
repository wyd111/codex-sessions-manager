export const DEFAULT_LANGUAGE = 'zh-CN';
export const LANGUAGE_STORAGE_KEY = 'codex-session-manager-language';

export const LANGUAGE_OPTIONS = [
  { title: '简体中文', value: 'zh-CN' },
  { title: 'English', value: 'en-US' },
];

const supportedLanguages = new Set(LANGUAGE_OPTIONS.map((item) => item.value));

const messages = {
  'zh-CN': {
    'actions.cancel': '取消',
    'actions.clearSelection': '清空选择',
    'actions.close': '关闭',
    'actions.confirmDelete': '确认删除',
    'actions.copyCommand': '复制命令',
    'actions.delete': '删除',
    'actions.deleteProject': '删除本项目',
    'actions.deleteSelected': '删除所选',
    'actions.details': '详情',
    'actions.newSessionCommand': '新建会话命令',
    'actions.refresh': '刷新',
    'actions.resumeCommand': '恢复命令',
    'actions.selectAllVisible': '全选当前列表',
    'actions.selectProject': '选择本项目',
    'actions.selectSession': '选择',
    'app.subtitle': '管理当前电脑上的 Codex 本地会话；支持不同 CODEX_HOME 来源切换。',
    'app.title': 'Codex 会话管理',
    'bulk.deleteRange': '删除范围仅限当前已索引的会话文件；操作完成后列表会自动刷新。',
    'bulk.deleteText': '将直接删除本地 {count} 个 Codex 会话 JSONL 文件。',
    'bulk.selected': '已选择 {selected} / {total} 个',
    'chat.assistant': '助手',
    'chat.empty': '暂无可显示的消息。',
    'chat.loading': '正在加载会话详情……',
    'chat.sessionId': '会话 ID：{id}',
    'chat.user': '用户',
    'command.copied': '已复制到剪贴板，粘贴到 PowerShell 执行即可。',
    'command.copyFailed': '复制失败，请手动复制。',
    'command.copyNewFailed': '新建会话命令复制失败，请稍后重试。',
    'command.copyResumeFailed': '自动复制失败，请手动复制下面的 PowerShell 命令。',
    'command.title': 'PowerShell 恢复命令',
    'common.archived': '归档',
    'common.defaultSource': '默认来源',
    'common.language': '语言',
    'common.messageUnit': '条消息',
    'common.na': 'N/A',
    'common.sessionsUnit': '个会话',
    'common.unknownDate': '未知日期',
    'common.unknownProject': '未知项目',
    'common.unknownSource': '未知来源',
    'common.unnamedSession': '未命名会话',
    'common.zeroSeconds': '0秒',
    'delete.bulkTitle': '确认批量删除',
    'delete.partialError': '已删除 {deleted} 个，{failed} 个失败：{messages}。{cleanup}',
    'delete.singleTitle': '确认删除会话',
    'delete.success': '已删除 {deleted} 个会话文件。{cleanup}',
    'empty.noSessions': '未找到会话文件。',
    'error.bulkDelete': '批量删除失败。',
    'error.loadSessionDetail': '加载会话详情失败。',
    'error.loadSessions': '加载会话文件失败。',
    'group.date': '按日期',
    'group.latestAt': '最近更新 {date}',
    'group.none': '不分组',
    'group.project': '按项目',
    'group.sessionCount': '{count} 个会话',
    'group.source': '按来源',
    'loading.sessions': '正在加载本机会话索引，大型会话目录首次加载可能需要一些时间。',
    'cleanup.none': '同步清理：无残留 App 索引需要清理。',
    'cleanup.prefix': '同步清理：',
    'cleanup.projectRootsRemoved': '移除空项目 {count} 个',
    'cleanup.separator': '，',
    'cleanup.sessionIndexRemoved': '清理会话索引 {count} 条',
    'cleanup.suffix': '。',
    'cleanup.threadsDeleted': '清理 App 线程索引 {count} 条',
    'cleanup.warning': '警告：{message}',
    'source.all': '全部来源',
    'source.label': '来源',
    'toggle.showEmpty': '显示空会话',
    'title.deleteProject': '删除本项目所有会话',
    'title.deleteSession': '删除该会话',
    'title.newSessionCommand': '复制到剪贴板',
    'title.resumeCommand': '显示 PowerShell 恢复命令',
    'title.selectAllVisible': '全选当前列表',
    'title.selectProject': '选择本项目所有会话',
    'title.viewDetails': '查看会话详情',
    'transcript.viewDetails': '点详情查看消息',
  },
  'en-US': {
    'actions.cancel': 'Cancel',
    'actions.clearSelection': 'Clear selection',
    'actions.close': 'Close',
    'actions.confirmDelete': 'Confirm delete',
    'actions.copyCommand': 'Copy command',
    'actions.delete': 'Delete',
    'actions.deleteProject': 'Delete project',
    'actions.deleteSelected': 'Delete selected',
    'actions.details': 'Details',
    'actions.newSessionCommand': 'New session command',
    'actions.refresh': 'Refresh',
    'actions.resumeCommand': 'Resume command',
    'actions.selectAllVisible': 'Select all visible',
    'actions.selectProject': 'Select project',
    'actions.selectSession': 'Select',
    'app.subtitle': 'Manage local Codex sessions on this computer; switch between different CODEX_HOME sources.',
    'app.title': 'Codex Session Manager',
    'bulk.deleteRange': 'Deletion is limited to currently indexed session files; the list refreshes automatically afterwards.',
    'bulk.deleteText': 'This will directly delete {count} local Codex session JSONL file(s).',
    'bulk.selected': 'Selected {selected} / {total}',
    'chat.assistant': 'Assistant',
    'chat.empty': 'No messages to display.',
    'chat.loading': 'Loading session details…',
    'chat.sessionId': 'Session ID: {id}',
    'chat.user': 'User',
    'command.copied': 'Copied to clipboard. Paste it into PowerShell to run.',
    'command.copyFailed': 'Copy failed. Please copy manually.',
    'command.copyNewFailed': 'Failed to copy the new-session command. Please try again.',
    'command.copyResumeFailed': 'Automatic copy failed. Please manually copy the PowerShell command below.',
    'command.title': 'PowerShell resume command',
    'common.archived': 'Archived',
    'common.defaultSource': 'Default source',
    'common.language': 'Language',
    'common.messageUnit': 'messages',
    'common.na': 'N/A',
    'common.sessionsUnit': 'sessions',
    'common.unknownDate': 'Unknown date',
    'common.unknownProject': 'Unknown project',
    'common.unknownSource': 'Unknown source',
    'common.unnamedSession': 'Untitled session',
    'common.zeroSeconds': '0 seconds',
    'delete.bulkTitle': 'Confirm bulk delete',
    'delete.partialError': 'Deleted {deleted}; {failed} failed: {messages}. {cleanup}',
    'delete.singleTitle': 'Confirm session delete',
    'delete.success': 'Deleted {deleted} session file(s). {cleanup}',
    'empty.noSessions': 'No session files found.',
    'error.bulkDelete': 'Bulk delete failed.',
    'error.loadSessionDetail': 'Failed to load session details.',
    'error.loadSessions': 'Failed to load session files.',
    'group.date': 'By date',
    'group.latestAt': 'Updated {date}',
    'group.none': 'No grouping',
    'group.project': 'By project',
    'group.sessionCount': '{count} sessions',
    'group.source': 'By source',
    'loading.sessions': 'Loading local session index. Large Codex homes may take a moment on first load.',
    'cleanup.none': 'App sync cleanup: no residual app index entries needed cleanup.',
    'cleanup.prefix': 'App sync cleanup: ',
    'cleanup.projectRootsRemoved': 'removed {count} empty project(s)',
    'cleanup.separator': ', ',
    'cleanup.sessionIndexRemoved': 'removed {count} session index item(s)',
    'cleanup.suffix': '.',
    'cleanup.threadsDeleted': 'removed {count} app thread index item(s)',
    'cleanup.warning': 'warning: {message}',
    'source.all': 'All sources',
    'source.label': 'Source',
    'toggle.showEmpty': 'Show empty sessions',
    'title.deleteProject': 'Delete all sessions in this project',
    'title.deleteSession': 'Delete this session',
    'title.newSessionCommand': 'Copy to clipboard',
    'title.resumeCommand': 'Show PowerShell resume command',
    'title.selectAllVisible': 'Select all sessions in the current list',
    'title.selectProject': 'Select all sessions in this project',
    'title.viewDetails': 'View session details',
    'transcript.viewDetails': 'Open details to load messages',
  },
};

export const isSupportedLanguage = (language) => supportedLanguages.has(language);

export const translate = (language, key, params = {}) => {
  const normalizedLanguage = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE;
  const template =
    messages[normalizedLanguage]?.[key] ||
    messages[DEFAULT_LANGUAGE]?.[key] ||
    key;

  return String(template).replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : `{${name}}`,
  );
};

export const getInitialLanguage = (storage = globalThis.localStorage) => {
  try {
    const stored = storage?.getItem?.(LANGUAGE_STORAGE_KEY);
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export const storeLanguage = (language, storage = globalThis.localStorage) => {
  if (!isSupportedLanguage(language)) return;
  try {
    storage?.setItem?.(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // localStorage can be unavailable in locked-down browser contexts.
  }
};
