<script setup>
import { computed } from 'vue';

const props = defineProps({
  session: {
    type: Object,
    required: true,
  },
  formatDate: {
    type: Function,
    required: true,
  },
  labels: {
    type: Object,
    required: true,
  },
  selected: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['open', 'show-resume', 'delete-session', 'toggle-select']);

const title = computed(
  () =>
    props.session.displayName ||
    props.session.threadName ||
    props.session.firstRequest ||
    props.session.sessionId ||
    props.labels.unnamedSession,
);

const dateText = computed(() =>
  props.formatDate(
    props.session.lastMessageAt || props.session.updatedAt || props.session.createdAt,
  ),
);

const handleOpen = () => emit('open', props.session);
const handleShowResume = () => emit('show-resume', props.session);
const handleDelete = () => emit('delete-session', props.session);
const handleToggleSelect = (value) => emit('toggle-select', props.session, value);
</script>

<template>
  <div class="session-row" role="button" tabindex="0" @click="handleOpen" @keyup.enter="handleOpen">
    <div class="row-select" @click.stop>
      <v-checkbox-btn
        :model-value="selected"
        density="compact"
        color="primary"
        :aria-label="`${labels.selectSession} ${title}`"
        @update:model-value="handleToggleSelect"
      />
    </div>

    <div class="row-icon">
      <v-icon icon="mdi-message-text-outline" size="20" />
    </div>

    <div class="row-main">
      <div class="d-flex align-center flex-wrap ga-2">
        <div class="session-title">
          {{ title }}
        </div>
        <v-chip
          v-if="session.archive"
          size="x-small"
          color="warning"
          variant="tonal"
        >
          {{ labels.archived }}
        </v-chip>
      </div>
      <div class="session-meta text-caption text-medium-emphasis">
        <span>{{ dateText }}</span>
        <span class="dot">•</span>
        <span>{{ session.sourceName || labels.defaultSource }}</span>
        <span v-if="session.cwd" class="dot">•</span>
        <span v-if="session.cwd" class="path">{{ session.cwd }}</span>
      </div>
    </div>

    <div
      v-if="session.hasTranscript"
      class="row-extra text-caption text-medium-emphasis d-none d-lg-flex"
    >
      <span>{{ session.entryCount || 0 }} {{ labels.messageUnit }}</span>
      <span class="dot">•</span>
      <span>{{ session.activeDuration || labels.zeroSeconds }}</span>
    </div>
    <div v-else class="row-extra text-caption text-medium-emphasis d-none d-lg-flex">
      {{ labels.viewDetailsToLoad }}
    </div>

    <div class="row-actions">
      <v-btn
        color="primary"
        variant="text"
        size="small"
        :title="labels.resumeTitle"
        @click.stop="handleShowResume"
      >
        <v-icon size="16" class="mr-1" icon="mdi-play-circle-outline" />
        {{ labels.resumeCommand }}
      </v-btn>
      <v-btn
        color="error"
        variant="text"
        size="small"
        :title="labels.deleteTitle"
        @click.stop="handleDelete"
      >
        <v-icon size="16" class="mr-1" icon="mdi-delete-outline" />
        {{ labels.delete }}
      </v-btn>
      <v-btn
        color="primary"
        variant="flat"
        size="small"
        :title="labels.detailsTitle"
        @click.stop="handleOpen"
      >
        {{ labels.details }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.session-row {
  display: grid;
  grid-template-columns: 28px 34px minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  min-height: 66px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(31, 41, 55, 0.07);
  background: rgba(255, 255, 255, 0.78);
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.row-select {
  display: grid;
  place-items: center;
}

.session-row:last-child {
  border-bottom: 0;
}

.session-row:hover {
  background: rgba(244, 247, 251, 0.96);
}

.session-row:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.row-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}

.row-main {
  min-width: 0;
}

.session-title {
  max-width: 100%;
  overflow: hidden;
  color: #111827;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 3px;
}

.path {
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dot {
  color: rgba(107, 114, 128, 0.72);
}

.row-extra {
  min-width: 120px;
  justify-content: flex-end;
  gap: 6px;
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

@media (max-width: 960px) {
  .session-row {
    grid-template-columns: 28px 34px minmax(0, 1fr);
  }

  .row-actions {
    grid-column: 3;
    justify-content: flex-start;
  }
}
</style>
