# Home native Android playback branch

Based on upstream YummyAnime 0.47.29 (`ca4f15c6acea64abc5e0aeed5afae7e6af60a04f`). This is a personal fork, not an official YummyAnime release.

Install **one** YummyAnime bundle in Lampa:

`https://andrewslastenko.github.io/yummy-lampa-plugin/dist/index.js`

Replace the official extension URL, then restart Lampa. The unchanged `stable/` directory remains upstream's bundle. Runtime needs internet, Lampa's Android wrapper and a result-returning external player, but no PC/server/account/subscription.

## Behavior

- The native Anime tab has a **Поиск аниме** header action. It searches YummyAnime through Lampa's normal search screen and opens a standard Lampa title card. If TMDB has no matching card, playback is offered directly.
- In a native anime card, choose **Смотреть → YummyAnime**, next to BWA, then select a voice and episode. The ordinary Lampa select menus launch the installed player without opening the separate YummyAnime catalog or detail page. YummyAnime is independent of BWA's balancer list.

- Native launches use distinct numeric result identities so late Android results cannot finish a reopened episode. Durable per-anime/episode/video/voice progress remains compatible with the prior Anime Progress bridge. The bridge passes existing timelines through unchanged.
- The native playlist has one item. Exact normal completion (`100/0/0` from the Lampa wrapper) records completion and, if the existing auto-next setting is enabled, resolves the next item in the same voice/source group. Back, including near the end, does not auto-advance.
- Resolution and deferred handoff are guarded by player generation, activity identity and navigation session. Stale or duplicate results cannot open an old episode over a new choice. Missing/unresolvable next streams return to the same episode picker.
- Local finished/half-watched flags persist without account/list automation. Unknown-duration completion is recognized by Continue Watching.
- Opening/ending auto-skip settings optionally annotate the media URL with bounded public MAL ID, integer episode and selected types in a reserved `homeafr_anime` fragment. JustPlayer Home AFR .5 removes it before media access and queries AniSkip using actual duration. No media URL, access token or history is sent to that API. The internal-player-only Suggest skip mode is unchanged.

The fork does not provide media or extra providers. Playback and metadata availability still depend on their upstream services. The five-second countdown and OK cancellation are implemented in the companion JustPlayer fork; older players ignore the HTTP fragment and play normally.

## Tests and build

Node 20, or Node 24 with its built-in navigator disabled to match upstream's browser-agent fixture:

```powershell
node --no-experimental-global-navigator --test tests/*.test.js
node build.js
node --check dist/index.js
```

124 checks passed. GX1 acceptance:2→3 and final9→10 retained Kodik/2x2 and JustPlayer; Back stopped, saved episode/voice returned. Opening/ending skip and OK cancellation passed with Home AFR .5. Last-episode and unavailable-next picker behavior is unit-tested rather than separately played to EOF on hardware. New behavior tests cover completion vs Back, duplicate/stale results, late resolver responses, navigation during deferred handoff, source metadata, durationless history and fragment identity. No dependency was added.

## Rollback

Set the extension URL back to `https://yummyanime.github.io/yummy-lampa-plugin/stable/index.js` and restart Lampa. Existing history uses the same storage keys. Keep the Anime Progress extension enabled for the official bundle. The original JustPlayer app is retained separately from Home AFR.
