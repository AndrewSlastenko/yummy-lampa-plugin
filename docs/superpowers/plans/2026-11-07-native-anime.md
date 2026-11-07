# Native anime integration implementation plan

> Use superpowers:executing-plans inline. The user approved the design and implementation; reuse the existing primary checkout, with a new feature branch and no disposable worktree.

**Goal:** Search from the Anime tab and select YummyAnime inside the installed BWA Online source menu without opening YummyAnime pages.

**Architecture:** A focused native-shell module decorates the native category lifecycle to add a Lampa header action and extends BWA's source Select menu. Reuse the existing YummyAnime search, native TMDB matching and playback menus; never replace BWA's component or its backend API.

**Tech stack:** Existing plain JavaScript bundle, Node VM tests, Android TV Lampa/BWA, installed Just Player and VPS resolver.

**Spec:** ../specs/2026-11-07-native-anime-design.md (approved by user: Ok).

## Global constraints

- Preserve resolver URL, history, voice preferences and installed player.
- Native search results open standard Lampa cards; unmatched TMDB titles offer playback without a custom YummyAnime page.
- Only the anime category gains the header action; ordinary categories and unrelated Select menus retain behavior.
- Keep BWA source selection and Source Auto wrappers compatible; ignore stale menu callbacks after navigation.

## Review focus

- Back from search restores the native category/header focus.
- Switching activity before selecting a source must not launch stale playback.
- Double installation/component registration must not duplicate actions or source entries.
- BWA source menus with Source Auto helper rows must still accept YummyAnime and other sources.
- Titles absent from TMDB must not create undefined-ID requests or custom detail redirects.

## Task 1: Native shell and search

Files: src/ui-native-shell.js (new), src/ui-search.js, src/ui-standard-card.js, src/ui.js, build.js; tests/native-shell.test.js, tests/search-module.test.js.

- [x] Write/run failing tests for anime detection, scoped native search, native-card selection/fallback, BWA menu injection, stale callback and delegation, lifecycle cleanup/idempotence.
- [x] Implement `LampaYaniNativeShell.install({lampa, $, openSearch, openPlayback, isAnime})`; decorate category_full start/pause/stop/destroy and Select.show only in bwa_online.
- [x] Add `searchController.openNative(onBack)` using `Search.open({sources:[source],onBack})`; retain global source and existing plugin search.
- [x] Reuse `openStandardLampaCard(card, fallback)` with playback fallback for the native search entry point. Register shell in plugin startup and include module in build.
- [x] Run focused and full tests, build dist, review diff and commit.

## Task 2: Device delivery and acceptance

- [ ] Inspect current extension URL via UI, preserve settings and obtain current content snapshot; publish only the personal fork deployment scope.
- [ ] Verify deployed bytes, restart Lampa, confirm visible Anime search and native search results/card.
- [ ] Open Online, select YummyAnime, select Alloha voice/episode, verify Just Player and Back behavior; record screenshots and state.
- [ ] Fresh independent review, regression suite, preserve commits and evidence; check worktrees/artifacts and clean only task-owned temporary resources.

## Ledger

- Baseline 6f9eb1e; only untracked approved design document exists. Prior VPS work committed and deployed.
- Installed Online implementation is BWA (bwa_online), not historical Online_Mod; BWA source menu uses Lampa.Select.show. Extend this menu instead of assuming Lampa.Online.register exists.

- Review: native Anime uses category/url anime/title Аниме - CUB; added regression plus hooks for both category and category_full. Lookup cancellation reproduced missing callback, fixed with Loading cancellation and timer cleanup; repeat review clean. 110/110 tests and bundle build pass. Installed personal extension URL confirmed through TV UI.

- Live: published a0e1e8d byte-verified; native category Anime header visible. Search Goblin finds title27105 and opens standard full card. Watch/BWA source list includes YummyAnime; native voice/episode Select menus launch Just Player (PLAYING, position361412ms, buffer414117ms); Back returns BWA.
- Compatibility: actual Watch also exposes separate Online_Mod. Allowlist extended to online_mod, failing regression then green; independent API review confirms its direct source menu source-item shape. Shared nested filter remains separate; direct source selector will be verified on device.
