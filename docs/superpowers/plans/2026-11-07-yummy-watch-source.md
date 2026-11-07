# YummyAnime as a native Watch source

User clarified and approved: YummyAnime belongs next to BWA in the native Watch source menu, not inside BWA. Selecting it opens existing native voice and episode menus directly. Preserve Anime search, resolver configuration, history and Just Player.

Reuse the existing primary checkout. Add a normal source button to the full-card `.buttons--container` through Lampa's `full/complite` hook, which runs before native `groupButtons`; the core builds the Watch menu from this container. Remove the former BWA/Online_Mod Select wrapper.

- [x] Regression test first: native source registration, idempotence, non-anime exclusion, stale card callback and untouched BWA menus. RED before change, GREEN after.
- [x] Implement and build bundle.
- [x] Full regression tests, independent review, publish existing personal extension URL.
- [x] Verify native Watch menu shows both BWA and YummyAnime on GX1; direct YummyAnime voice/episode selection launches Just Player. Verify Back and unchanged Anime search, then clean task artifacts/worktrees.

Review found late full-card completion captured the wrong active owner; bind source to event.object. Regression reproduced failure before fix and passes after it. Repeat review clean; all110 tests pass. User permits interrupting current Bleach playback for TV verification.

TV acceptance complete: Watch lists BWA and YummyAnime as independent peers; direct YummyAnime selection opens voice/episode lists on the native Bleach card. Alloha/2x2 episode1 launched Just Player at26005ms with64042ms buffered, no error; Back returned to native Bleach card. Anime search still used to find the title. Published bundle byte-verified, review clean,110tests pass. No temporary worktrees/tunnels or device UI dumps remain; primary checkout retained. Evidence: C:/projects/home/diagnostics/yummy-watch-source-2026-11-07/verification.json.
