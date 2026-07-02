<script setup>
import { computed } from 'vue';

const props = defineProps({
  groupBy: {
    type: String,
    required: true,
  },
  groupOptions: {
    type: Array,
    required: true,
  },
  labels: {
    type: Object,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  languageOptions: {
    type: Array,
    required: true,
  },
  sessionsCount: {
    type: Number,
    default: 0,
  },
  sourceFilter: {
    type: String,
    required: true,
  },
  sourceOptions: {
    type: Array,
    required: true,
  },
  showEmpty: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'update:groupBy',
  'update:language',
  'update:sourceFilter',
  'update:showEmpty',
  'refresh',
]);

const groupModel = computed({
  get: () => props.groupBy,
  set: (value) => emit('update:groupBy', value),
});

const languageModel = computed({
  get: () => props.language,
  set: (value) => emit('update:language', value),
});

const showEmptyModel = computed({
  get: () => props.showEmpty,
  set: (value) => emit('update:showEmpty', value),
});

const sourceFilterModel = computed({
  get: () => props.sourceFilter,
  set: (value) => emit('update:sourceFilter', value),
});
</script>

<template>
  <div class="header-sticky d-flex align-center justify-space-between flex-wrap px-4 px-md-6">
    <div class="title-block">
      <h1 class="text-h5 font-weight-bold mb-1">{{ labels.appTitle }}</h1>
      <p class="text-body-2 text-medium-emphasis">
        {{ labels.appSubtitle }}
      </p>
    </div>
    <div class="d-flex align-center gap-3 flex-wrap">
      <v-select
        v-model="languageModel"
        :items="languageOptions"
        :label="labels.languageLabel"
        density="compact"
        hide-details
        class="language-select mr-3"
      />
      <v-select
        v-model="sourceFilterModel"
        :items="sourceOptions"
        :label="labels.sourceLabel"
        density="compact"
        hide-details
        class="source-select mr-3"
      />
      <v-btn-toggle
        v-model="groupModel"
        divided
        density="compact"
        class="group-toggle mr-3"
      >
        <v-btn
          v-for="option in groupOptions"
          :key="option.value"
          :value="option.value"
          variant="outlined"
        >
          {{ option.title }}
        </v-btn>
      </v-btn-toggle>
      <v-chip color="primary" variant="flat" class="text-body-2">
        {{ sessionsCount }} {{ labels.sessionsUnit }}
      </v-chip>
      <v-checkbox
        v-model="showEmptyModel"
        density="compact"
        hide-details
        :label="labels.showEmpty"
        class="ml-2"
      />
      <v-btn
        color="secondary"
        variant="flat"
        size="default"
        class="refresh-btn"
        @click="emit('refresh')"
      >
        <v-icon size="18" class="mr-1" icon="mdi-refresh"></v-icon>
        {{ labels.refresh }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.header-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 0 14px;
  margin: 0;
  background: rgba(247, 248, 250, 0.94);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.title-block {
  min-width: 260px;
}

.group-toggle {
  min-width: 250px;
}

.source-select {
  min-width: 190px;
}

.language-select {
  min-width: 150px;
}

.refresh-btn {
  margin-left: 8px;
}
</style>
