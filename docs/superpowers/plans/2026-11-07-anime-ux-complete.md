# Complete native anime UX

The user approved all six proposed improvements and explicitly requested continuous implementation without further design check-ins. Reuse primary checkout; baseline570eab7. Preserve playback history, resolver/private settings, BWA and installed APKs. Use ui-ux-pro-max and TDD; final independent review and live GX1 acceptance.

## Deliverables

1. Native card's main action shows Continue with episode/time when valid progress exists; direct resume uses saved voice/provider and never silently substitutes another voice. Secondary action selects episodes.
2. Anime default source setting in native Player settings (YummyAnime/BWA/Ask), default YummyAnime. Other Sources retains native Watch menu including BWA and independent YummyAnime. Non-anime behavior unchanged.
3. Remove red YummyAnime logo button and its obsolete setting from native cards; retain useful YA rating and normal source entry.
4. Episode browser supports numeric jump, metadata-backed seasons/arcs if supplied, otherwise neutral groups of25 for long lists; current/watched states and focus restoration. Never invent season/arc names.
5. Cancellable native loading phases and retry/choose-source errors; cancellations suppress late resolver/playback callbacks. Preserve chosen episode while retrying/changing source.
6. Return from player to the same episode list when launched there, keeping selection/range; Back returns to its actual parent. Resume from card returns to card.

## Independent modules / ownership

- src/ui-episode-browser.js + tests/episode-browser.test.js: self-contained native Select browser. create({showSelect,input,value,title,getPlayback}) returns open(card,group,videos,{onSelect(video,restore),onBack,onVoices,onReset,resettable}). restore reopens selected range/episode, preferring latest progress if changed. onBack callbacks returning false consume navigation.
- src/ui-playback-operation.js + tests/playback-operation.test.js: create({lampa,onCancel}) returns begin(message,{onCancel}); operation current(), finish()->boolean, cancel(), fail({message,retry,alternate}). One current operation, native cancellable Loading, late callbacks suppressed, bounded safe error choices.
- Root owns ui-native-shell, ui-playback-menu, ui.js, ui-standard-card, i18n/build/styles integration and tests. Modules implement in separate files without touching integration files.

## Steps

- [x] Implement/test independent modules, RED then GREEN.
- [x] Native card primary/secondary/default-source behavior and removal of red button, with meaningful tests.
- [x] Integrate episode browser, exact voice resume and parent/list return; cancellable catalog/video/resolver acquisition and safe retry/source choice.
- [x] Full regression suite, bundle build, independent review and fixes.
- [x] Publish personal extension, verify bytes and native GX1 flows; document verification and check task resources/worktrees.

## Acceptance focus

Missing/deleted saved voice must offer explicit selection. Completed final episodes must not resume a fictitious next episode. Fractional/special episodes remain accessible. No source URL/token in notices. No stale loader or callback after Back/navigation/new request. No guessed arc grouping. Other-source actions remain reachable by remote and do not become default accidentally. Reopening cards never duplicates controls.

## Verification outcome

Runtime published on personal Pages, latest runtime commit2a3b504. Published dist SHA256 matches local bundle. Full regression:116 test files pass with `node --no-experimental-global-navigator`; final focus-class correction additionally passes native-card-actions. Build and diff whitespace checks pass.

Independent review found native groupButtons rebinding, consumed root return state, stale Loading controller restoration, and a source-menu restoration timer race; all corrected. Physical GX1 validation then found Android return lifecycle consuming the list callback early. Added launch-time owner/session/snapshot capture, guarded delayed native-return restoration including zero-progress Back, and hidden-WebView restoration guards. Behavioral regression tests cover these paths and auto-next exclusion.

GX1: Bleach native card has Continue/Choose episode/Other sources, YA rating retained and red custom-page button absent. Choose episode opens saved2x2/Alloha. Native numeric keyboard jumps to287; Alloha plays287 in Just Player. Back restores the same range and selected287; next Back restores the card. Other sources shows BWA and independent YummyAnime. Player settings exposes YummyAnime/BWA/Ask; selecting BWA routes the main action directly into BWA. Restored YummyAnime default. Returned viewing to episode1; quick Continue launched from53sec, Back returned directly to native card at about1:02. Error/retry/alternate and cancellation/stale-result paths validated with deterministic behavioral tests; no intentional network outage on the physical device.

Detailed test output, published bytes and device screenshots are outside Git under `C:/projects/home/diagnostics/anime-ux-2026-11-07/`. No worktrees created or attached; only existing primary checkout retained. No APK, resolver credentials or infrastructure changed.
