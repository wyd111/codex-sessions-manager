# Multi-Source Codex Session Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build local multi-source Codex session browsing and resume command generation without touching login state.

**Architecture:** Add small testable modules for source config/indexing and command generation, then wire them into the existing Vite middleware and Vue UI. The server remains read-only and serves only JSONL files under configured source roots.

**Tech Stack:** Vite 5, Vue 3, Vuetify 3, Node.js ESM, Vitest.

---

## File Structure

- Create `server/sessionSources.js`: parse `CODEX_SESSION_SOURCES`, provide fallback source config, scan active and archived JSONL files, and serve files by source/file id.
- Create `src/utils/sessionCommands.js`: build PowerShell-friendly resume/new/remove commands from parsed session metadata.
- Create `src/utils/sessionSources.js`: extract source options for header filters.
- Create tests under `tests/` for source parsing/indexing, parsing metadata preservation, and command generation.
- Modify `vite.config.js`: use `server/sessionSources.js` for `/__sessions_index` and `/__session_file`.
- Modify `src/utils/sessionApi.js`: preserve index entry metadata while loading raw files.
- Modify `src/utils/sessionParsing.js`: carry source/archive/full-path metadata into parsed session objects.
- Modify `src/App.vue`, `src/components/SessionHeader.vue`, `src/components/SessionCard.vue`, and `src/components/ChatDialog.vue`: add source filter, source grouping, source/archive labels, and source-aware commands.
- Modify `package.json`, `README.md`, and `.env.example`: document configuration and add test script/dependencies.

## Task 1: Add test harness

**Files:**
- Modify: `package.json`

- [ ] Add `vitest` as a dev dependency and `test` script.
- [ ] Run `pnpm install --frozen-lockfile` if dependencies are missing; otherwise run `pnpm install` to update lockfile for Vitest.
- [ ] Run `pnpm test -- --run`; expected initial result is no tests found or an empty-suite failure before tests are added.

## Task 2: Server-side source parsing and indexing

**Files:**
- Create: `server/sessionSources.js`
- Test: `tests/sessionSources.test.js`
- Modify: `vite.config.js`

- [ ] Write tests for:
  - parsing `CODEX_SESSION_SOURCES` JSON into normalized sources;
  - fallback to `SESSIONS_ROOT_PATH`;
  - deriving `sessions` and `archived_sessions` roots from `codexHome`;
  - indexing JSONL files with `source`, `archive`, `rel`, `fullPath`, and `/__session_file/...` URL.
- [ ] Run the test and confirm it fails because `server/sessionSources.js` does not exist.
- [ ] Implement minimal source parsing/indexing and safe file lookup.
- [ ] Run the test and confirm it passes.
- [ ] Wire `vite.config.js` to use the new helpers.

## Task 3: Preserve source metadata on loaded sessions

**Files:**
- Modify: `src/utils/sessionApi.js`
- Modify: `src/utils/sessionParsing.js`
- Test: `tests/sessionParsing.test.js`

- [ ] Write tests proving loaded raw files keep `source`, `sourceId`, `sourceName`, `codexHome`, `sessionsRoot`, `archive`, `fullPath`, and unique ids.
- [ ] Run the test and confirm it fails on missing metadata.
- [ ] Update API loading and parser return object.
- [ ] Run the test and confirm it passes.

## Task 4: Source-aware command generation

**Files:**
- Create: `src/utils/sessionCommands.js`
- Test: `tests/sessionCommands.test.js`
- Modify: `src/App.vue`

- [ ] Write tests for:
  - PowerShell command with `$env:CODEX_HOME`, quoted cwd, and `codex resume <id>`;
  - fallback legacy command when no `codexHome` exists;
  - new-session command for a source;
  - remove command using `fullPath`.
- [ ] Run the test and confirm it fails because command helper is missing.
- [ ] Implement command helpers.
- [ ] Replace inline command building in `App.vue`.
- [ ] Run the test and confirm it passes.

## Task 5: UI source filter, grouping, and labels

**Files:**
- Create: `src/utils/sessionSources.js`
- Modify: `src/App.vue`
- Modify: `src/components/SessionHeader.vue`
- Modify: `src/components/SessionCard.vue`
- Modify: `src/components/ChatDialog.vue`

- [ ] Add a computed source list and selected source id.
- [ ] Add header source select with `All sources`.
- [ ] Add group option `By source`.
- [ ] Add source and archive chips to cards and dialog title.
- [ ] Keep existing project/date/no-group behavior unchanged.

## Task 6: Documentation and verification

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] Document `CODEX_SESSION_SOURCES` with a Windows example for `C:/Users/<WindowsUser>/.codex`.
- [ ] Keep the original `SESSIONS_ROOT_PATH` Docker/WSL setup documented as fallback.
- [ ] Run `pnpm test -- --run`.
- [ ] Run `pnpm run build`.
- [ ] Review `git diff` for secrets; confirm no auth tokens or API keys are committed.
