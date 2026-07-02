<script setup>
const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  session: {
    type: Object,
    default: null,
  },
  formatDate: {
    type: Function,
    required: true,
  },
  labels: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue', 'show-resume', 'close']);

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const copyResume = () => {
  if (!props.session) return;
  emit('show-resume', props.session);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card v-if="session">
      <v-card-title class="d-flex align-center">
        <div>
          <div class="text-subtitle-1 font-weight-bold">
            {{ session.displayName || session.firstRequest || session.projectName }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ labels.sessionId(session.sessionId) }}
          </div>
          <div class="d-flex align-center ga-2 mt-1">
            <v-chip size="x-small" color="primary" variant="tonal">
              {{ session.sourceName || labels.defaultSource }}
            </v-chip>
            <v-chip
              v-if="session.archive"
              size="x-small"
              color="warning"
              variant="tonal"
            >
              {{ labels.archived }}
            </v-chip>
          </div>
        </div>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          class="mr-2"
          :title="labels.resumeTitle"
          @click="copyResume"
        >
          <v-icon size="16" class="mr-1" icon="mdi-play-circle-outline"></v-icon>
          {{ labels.resumeCommand }}
        </v-btn>
        <v-btn icon="mdi-close" variant="text" @click="close" />
      </v-card-title>

      <v-card-text class="chat-scroll">
        <v-alert v-if="error" type="error" variant="tonal" class="mb-3">
          {{ error }}
        </v-alert>

        <div v-if="loading" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="28" class="mr-3" />
          <span class="text-body-2 text-medium-emphasis">{{ labels.loading }}</span>
        </div>

        <div v-else-if="!session.messages?.length && !error" class="empty-detail">
          <v-icon icon="mdi-message-off-outline" size="24" class="mb-2" />
          <div class="text-body-2 text-medium-emphasis">{{ labels.empty }}</div>
        </div>

        <div v-else class="d-flex flex-column gap-3">
          <div
            v-for="(msg, idx) in session.messages"
            :key="`${session.id}-${idx}`"
            :class="[
              'chat-row',
              msg.role === 'assistant' ? 'is-assistant' : 'is-user',
            ]"
          >
            <div class="chat-meta text-caption text-medium-emphasis mb-1">
              <v-icon
                size="16"
                class="mr-1"
                :icon="msg.role === 'assistant' ? 'mdi-robot-outline' : 'mdi-account-circle'"
              />
              <span class="mr-2 text-uppercase">
                {{ msg.role === 'assistant' ? labels.assistant : labels.user }}
              </span>
              <span>{{ formatDate(msg.timestamp) }}</span>
            </div>
            <div class="chat-bubble text-body-2">
              <pre class="ma-0">{{ msg.text }}</pre>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="close">{{ labels.close }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.chat-scroll {
  max-height: 70vh;
}

.detail-loading,
.empty-detail {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
}

.empty-detail {
  flex-direction: column;
}

.chat-row {
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
}

.chat-row.is-user {
  align-items: flex-start;
}

.chat-row.is-assistant {
  align-items: flex-end;
}

.chat-bubble {
  background: #f4f6f8;
  border-radius: 10px;
  padding: 10px 12px;
  max-width: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.chat-row.is-assistant .chat-bubble {
  background: #e0e7ff;
}

.chat-bubble pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
</style>
