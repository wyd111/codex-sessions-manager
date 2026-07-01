<script setup>
import { computed, ref } from 'vue';
import ChatDialog from './components/ChatDialog.vue';
import SessionCard from './components/SessionCard.vue';
import SessionHeader from './components/SessionHeader.vue';
import {
  buildNewSessionCommand,
  buildResumeCommand,
} from './utils/sessionCommands';
import { deleteSessions, loadSessionRaw, loadSessions } from './utils/sessionApi';
import { NO_REQUEST_TEXT, formatDate, formatDuration, parseSessions } from './utils/sessionParsing';
import {
  ALL_SOURCES_VALUE,
  filterSessionsBySource,
  sourceOptionsFromSessions,
} from './utils/sessionSources';

const rawSessionFiles = ref([]);

const showEmpty = ref(false);
const sourceFilter = ref(ALL_SOURCES_VALUE);
const isLoading = ref(false);
const loadError = ref('');
const selectedIds = ref(new Set());
const bulkDeleteOpen = ref(false);
const bulkDeleteLoading = ref(false);
const bulkDeleteError = ref('');
const bulkDeleteMessage = ref('');
const commandDialogOpen = ref(false);
const commandDialogCommand = ref('');
const commandDialogCopied = ref(false);
const commandDialogError = ref('');

const parsedSessions = computed(() => parseSessions(rawSessionFiles.value));
const sourceOptions = computed(() => sourceOptionsFromSessions(parsedSessions.value));

const sessions = computed(() => {
  let list = filterSessionsBySource(parsedSessions.value, sourceFilter.value);
  if (!showEmpty.value) {
    list = list.filter((session) => session.firstRequest !== NO_REQUEST_TEXT);
  }
  return list;
});

const sessionSortTime = (session) => {
  const time = new Date(
    session.lastMessageAt || session.updatedAt || session.createdAt || 0,
  ).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sessionsList = computed(() => {
  const unique = new Map();
  sessions.value.forEach((s) => {
    const key = `${s.sourceId || 'default'}:${s.sessionId || s.id}`;
    const current = unique.get(key);
    if (!current) {
      unique.set(key, s);
      return;
    }
    const currentTime = sessionSortTime(current);
    const newTime = sessionSortTime(s);
    if (newTime > currentTime) {
      unique.set(key, s);
    }
  });
  return Array.from(unique.values()).sort((a, b) => sessionSortTime(b) - sessionSortTime(a));
});

const selectedSessions = computed(() =>
  sessionsList.value.filter((session) => selectedIds.value.has(session.id)),
);

const allVisibleSelected = computed(
  () =>
    sessionsList.value.length > 0 &&
    sessionsList.value.every((session) => selectedIds.value.has(session.id)),
);

const isSessionSelected = (session) => selectedIds.value.has(session.id);

const setSessionSelected = (session, selected) => {
  const next = new Set(selectedIds.value);
  if (selected) {
    next.add(session.id);
  } else {
    next.delete(session.id);
  }
  selectedIds.value = next;
};

const selectAllVisible = () => {
  selectedIds.value = new Set(sessionsList.value.map((session) => session.id));
};

const clearSelection = () => {
  selectedIds.value = new Set();
};

const toggleAllVisible = (selected) => {
  if (selected) {
    selectAllVisible();
  } else {
    clearSelection();
  }
};

const selectSessions = (items) => {
  selectedIds.value = new Set((items || []).map((session) => session.id));
};

const groupBy = ref('project');

const groupOptions = [
  { title: '按项目', value: 'project' },
  { title: '按来源', value: 'source' },
  { title: '按日期', value: 'date' },
  { title: '不分组', value: 'none' },
];

const formatDay = (value) => {
  if (!value) return '未知日期';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知日期';
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const groupedSessions = computed(() => {
  const list = sessionsList.value;
  if (groupBy.value === 'none') {
    return [{ label: null, items: list }];
  }

  const map = new Map();
  list.forEach((session) => {
    let key;
    if (groupBy.value === 'project') {
      key = session.projectName || '未知项目';
    } else if (groupBy.value === 'source') {
      key = session.sourceName || '未知来源';
    } else {
      key = formatDay(session.lastMessageAt || session.updatedAt || session.createdAt);
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(session);
  });

  const groups = Array.from(map.entries()).map(([label, items]) => {
    const sortedItems = [...items].sort((a, b) => sessionSortTime(b) - sessionSortTime(a));
    const totalActiveMs = items.reduce((sum, session) => sum + (session.activeMs || 0), 0);
    const totalUserCommands = items.reduce(
      (sum, session) => sum + (session.userCommandCount || 0),
      0,
    );
    return {
      label,
      items: sortedItems,
      latestAt: sortedItems[0]?.lastMessageAt || sortedItems[0]?.updatedAt || sortedItems[0]?.createdAt || '',
      summary: {
        active: formatDuration(totalActiveMs),
        userCommands: totalUserCommands,
      },
    };
  });

  return groups.sort((a, b) => {
    if (groupBy.value === 'date') {
      return sessionSortTime(b.items[0] || {}) - sessionSortTime(a.items[0] || {});
    }
    return sessionSortTime(b.items[0] || {}) - sessionSortTime(a.items[0] || {})
      || String(a.label).localeCompare(String(b.label), 'zh-CN');
  });
});

const dialogSession = ref(null);
const dialogOpen = ref(false);
const dialogLoading = ref(false);
const dialogError = ref('');
let detailRequestId = 0;

const refreshSessions = async () => {
  isLoading.value = true;
  loadError.value = '';
  try {
    rawSessionFiles.value = await loadSessions();
  } catch (err) {
    console.warn('Failed to refresh sessions', err);
    loadError.value = err?.message || '加载会话文件失败。';
    rawSessionFiles.value = [];
  } finally {
    isLoading.value = false;
  }
};

refreshSessions();

const openSession = async (session) => {
  const requestId = detailRequestId + 1;
  detailRequestId = requestId;
  dialogSession.value = session;
  dialogOpen.value = true;
  dialogLoading.value = true;
  dialogError.value = '';

  try {
    const raw = await loadSessionRaw(session);
    const [detail] = parseSessions([{ ...session, raw }]);
    if (requestId === detailRequestId) {
      dialogSession.value = detail || session;
    }
  } catch (err) {
    console.warn('Failed to load session detail', err);
    if (requestId === detailRequestId) {
      dialogError.value = err?.message || '加载会话详情失败。';
    }
  } finally {
    if (requestId === detailRequestId) {
      dialogLoading.value = false;
    }
  }
};

const closeSession = () => {
  detailRequestId += 1;
  dialogOpen.value = false;
  dialogSession.value = null;
  dialogLoading.value = false;
  dialogError.value = '';
};

const copyTextFallback = (text) => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.className = 'copy-fallback';
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    textarea.remove();
  }
};

const copyText = async (text) => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard copy failed', err);
  }

  try {
    return copyTextFallback(text);
  } catch (err) {
    console.warn('Fallback clipboard copy failed', err);
    return false;
  }
};

const showResumeCommand = async (session) => {
  const cmd = buildResumeCommand(session);
  commandDialogCommand.value = cmd;
  commandDialogCopied.value = false;
  commandDialogError.value = '';
  commandDialogOpen.value = true;

  const copied = await copyText(cmd);
  commandDialogCopied.value = copied;
  if (!copied) {
    commandDialogError.value = '自动复制失败，请手动复制下面的 PowerShell 命令。';
  }
};

const copyNewSession = async (session) => {
  const cmd = buildNewSessionCommand(session);
  const copied = await copyText(cmd);
  if (!copied) {
    loadError.value = '新建会话命令复制失败，请稍后重试。';
  }
};

const copyCommandAgain = async () => {
  const copied = await copyText(commandDialogCommand.value);
  commandDialogCopied.value = copied;
  commandDialogError.value = copied ? '' : '复制失败，请手动复制。';
};

const requestBulkDelete = () => {
  bulkDeleteError.value = '';
  bulkDeleteMessage.value = '';
  if (!selectedSessions.value.length) return;
  bulkDeleteOpen.value = true;
};

const requestDeleteSessions = (items) => {
  selectSessions(items);
  bulkDeleteError.value = '';
  bulkDeleteMessage.value = '';
  if (!items?.length) return;
  bulkDeleteOpen.value = true;
};

const formatCleanupSummary = (cleanup) => {
  if (!cleanup) return '';

  const parts = [];
  if (cleanup.threadsDeleted) {
    parts.push(`清理 App 线程索引 ${cleanup.threadsDeleted} 条`);
  }
  if (cleanup.sessionIndexRemoved) {
    parts.push(`清理会话索引 ${cleanup.sessionIndexRemoved} 条`);
  }
  if (cleanup.projectRootsRemoved?.length) {
    parts.push(`移除空项目 ${cleanup.projectRootsRemoved.length} 个`);
  }
  if (cleanup.warnings?.length) {
    parts.push(`警告：${cleanup.warnings.join('；')}`);
  }

  return parts.length ? `同步清理：${parts.join('，')}。` : '同步清理：无残留 App 索引需要清理。';
};

const closeBulkDelete = () => {
  if (bulkDeleteLoading.value) return;
  bulkDeleteOpen.value = false;
};

const confirmBulkDelete = async () => {
  const targets = [...selectedSessions.value];
  if (!targets.length) {
    bulkDeleteOpen.value = false;
    return;
  }

  bulkDeleteLoading.value = true;
  bulkDeleteError.value = '';
  bulkDeleteMessage.value = '';

  try {
    const result = await deleteSessions(targets);
    const cleanupSummary = formatCleanupSummary(result.appCleanup);
    if (result.failed.length) {
      bulkDeleteError.value = `已删除 ${result.deleted} 个，${result.failed.length} 个失败：${result.failed
        .map((item) => item.message)
        .join('；')}。${cleanupSummary}`;
      selectedIds.value = new Set(result.failed.map((item) => item.session.id));
    } else {
      bulkDeleteMessage.value = `已删除 ${result.deleted} 个会话文件。${cleanupSummary}`;
      clearSelection();
      bulkDeleteOpen.value = false;
    }
    await refreshSessions();
  } catch (err) {
    console.warn('Bulk delete failed', err);
    bulkDeleteError.value = err?.message || '批量删除失败。';
  } finally {
    bulkDeleteLoading.value = false;
  }
};
</script>

<template>
  <v-app>
    <v-main>
      <v-container fluid class="pt-0 pb-6 px-0">
        <SessionHeader
          v-model:group-by="groupBy"
          v-model:show-empty="showEmpty"
          v-model:source-filter="sourceFilter"
          :group-options="groupOptions"
          :source-options="sourceOptions"
          :sessions-count="sessionsList.length"
          @refresh="refreshSessions"
        />

        <div class="page-pad">
          <v-alert
            v-if="isLoading"
            type="info"
            variant="tonal"
            class="mb-4"
          >
            正在加载本机会话索引，大型会话目录首次加载可能需要一些时间。
          </v-alert>

          <v-alert
            v-if="loadError"
            type="error"
            variant="tonal"
            class="mb-4"
          >
            {{ loadError }}
          </v-alert>

          <v-alert
            v-if="bulkDeleteMessage"
            type="success"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="bulkDeleteMessage = ''"
          >
            {{ bulkDeleteMessage }}
          </v-alert>

          <div v-if="sessionsList.length" class="bulk-bar mb-4">
            <div class="d-flex align-center">
              <v-checkbox-btn
                :model-value="allVisibleSelected"
                density="compact"
                color="primary"
                aria-label="全选当前列表"
                @update:model-value="toggleAllVisible"
              />
              <div class="text-body-2 font-weight-medium ml-1">
                已选择 {{ selectedSessions.length }} / {{ sessionsList.length }} 个
              </div>
            </div>
            <v-spacer />
            <v-btn
              variant="text"
              size="small"
              :disabled="allVisibleSelected"
              @click="selectAllVisible"
            >
              全选当前列表
            </v-btn>
            <v-btn
              variant="text"
              size="small"
              :disabled="!selectedSessions.length"
              @click="clearSelection"
            >
              清空选择
            </v-btn>
            <v-btn
              color="error"
              variant="flat"
              size="small"
              :disabled="!selectedSessions.length"
              @click="requestBulkDelete"
            >
              <v-icon size="16" class="mr-1" icon="mdi-delete-sweep-outline" />
              删除所选
            </v-btn>
          </div>

          <div v-for="group in groupedSessions" :key="group.label || 'all'" class="project-group mb-4">
            <div v-if="group.label" class="group-title d-flex align-center mb-1">
              <v-icon icon="mdi-folder-outline" size="18" class="mr-2 text-medium-emphasis" />
              <div class="text-subtitle-2 font-weight-semibold mr-2">
                {{ group.label }}
              </div>
              <v-chip size="x-small" variant="tonal" color="primary">
                {{ group.items.length }} 个会话
              </v-chip>
              <div class="text-caption text-medium-emphasis ml-3 d-none d-md-block">
                最近更新 {{ formatDate(group.latestAt) }}
              </div>
              <v-spacer />
              <v-btn
                v-if="groupBy === 'project'"
                color="primary"
                variant="text"
                size="small"
                title="选择本项目所有会话"
                @click="selectSessions(group.items)"
              >
                选择本项目
              </v-btn>
              <v-btn
                v-if="groupBy === 'project'"
                color="error"
                variant="text"
                size="small"
                title="删除本项目所有会话"
                @click="requestDeleteSessions(group.items)"
              >
                <v-icon size="16" class="mr-1" icon="mdi-delete-outline"></v-icon>
                删除本项目
              </v-btn>
              <v-btn
                v-if="groupBy === 'project'"
                color="primary"
                variant="text"
                size="small"
                title="复制到剪贴板"
                @click="copyNewSession(group.items[0])"
              >
                <v-icon size="16" class="mr-1" icon="mdi-plus-circle-outline"></v-icon>
                新建会话命令
              </v-btn>
            </div>
            <div class="session-list">
              <SessionCard
                v-for="session in group.items"
                :key="session.id"
                :session="session"
                :format-date="formatDate"
                :selected="isSessionSelected(session)"
                @show-resume="showResumeCommand"
                @delete-session="requestDeleteSessions([$event])"
                @open="openSession"
                @toggle-select="setSessionSelected"
              />
            </div>
          </div>

          <v-alert
            v-if="!isLoading && !sessionsList.length"
            type="info"
            variant="tonal"
            class="mt-4"
          >
            未找到会话文件。
          </v-alert>
        </div>
      </v-container>

      <ChatDialog
        v-model="dialogOpen"
        :session="dialogSession"
        :format-date="formatDate"
        :loading="dialogLoading"
        :error="dialogError"
        @show-resume="showResumeCommand"
        @close="closeSession"
      />

      <v-dialog v-model="commandDialogOpen" max-width="760">
        <v-card>
          <v-card-title class="text-h6 font-weight-bold">
            PowerShell 恢复命令
          </v-card-title>
          <v-card-text>
            <v-alert
              v-if="commandDialogCopied"
              type="success"
              variant="tonal"
              class="mb-3"
            >
              已复制到剪贴板，粘贴到 PowerShell 执行即可。
            </v-alert>
            <v-alert
              v-if="commandDialogError"
              type="warning"
              variant="tonal"
              class="mb-3"
            >
              {{ commandDialogError }}
            </v-alert>
            <pre class="command-block">{{ commandDialogCommand }}</pre>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="commandDialogOpen = false">
              关闭
            </v-btn>
            <v-btn color="primary" variant="flat" @click="copyCommandAgain">
              复制命令
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="bulkDeleteOpen" max-width="520">
        <v-card>
          <v-card-title class="text-h6 font-weight-bold">
            {{ selectedSessions.length === 1 ? '确认删除会话' : '确认批量删除' }}
          </v-card-title>
          <v-card-text>
            <v-alert
              v-if="bulkDeleteError"
              type="error"
              variant="tonal"
              class="mb-3"
            >
              {{ bulkDeleteError }}
            </v-alert>
            <p class="mb-2">
              将直接删除本地 {{ selectedSessions.length }} 个 Codex 会话 JSONL 文件。
            </p>
            <p class="text-body-2 text-medium-emphasis">
              删除范围仅限当前已索引的会话文件；操作完成后列表会自动刷新。
            </p>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              :disabled="bulkDeleteLoading"
              @click="closeBulkDelete"
            >
              取消
            </v-btn>
            <v-btn
              color="error"
              variant="flat"
              :loading="bulkDeleteLoading"
              :disabled="!selectedSessions.length"
              @click="confirmBulkDelete"
            >
              确认删除
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-main>
  </v-app>
</template>

<style scoped>
.page-pad {
  padding: 20px 16px 0;
}

@media (min-width: 960px) {
  .page-pad {
    padding: 20px 24px 0;
  }
}

.project-group {
  max-width: 1180px;
  margin: 0 auto;
}

.group-title {
  min-height: 38px;
}

.session-list {
  overflow: hidden;
  border: 1px solid rgba(31, 41, 55, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
}

.bulk-bar {
  display: flex;
  max-width: 1180px;
  min-height: 48px;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  padding: 8px 12px;
  border: 1px solid rgba(31, 41, 55, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.command-block {
  padding: 12px;
  border-radius: 10px;
  background: #111827;
  color: #f9fafb;
  white-space: pre-wrap;
  word-break: break-word;
}

:global(.v-main) {
  padding-top: 0 !important;
}
</style>
