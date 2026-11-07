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

- [ ] Implement/test the two independent modules, RED then GREEN.
- [ ] Native card primary/secondary/default-source behavior and removal of red button, with meaningful tests.
- [ ] Integrate episode browser, exact voice resume and parent/list return; cancellable catalog/video/resolver acquisition and safe retry/source choice.
- [ ] Full regression suite, bundle build, whole-change independent review and fixes.
- [ ] Publish personal extension, verify bytes and all six scenarios on GX1; preserve original viewing state as practical, document results and clean task resources/worktrees.

## Acceptance focus

Missing/deleted saved voice must offer explicit selection. Completed final episodes must not resume a fictitious next episode. Fractional/special episodes remain accessible. No source URL/token in notices. No stale loader or callback after Back/navigation/new request. No guessed arc grouping. Other-source actions remain reachable by remote and do not become default accidentally. Reopening cards never duplicates controls.
