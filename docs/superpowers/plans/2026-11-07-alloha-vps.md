# Alloha VPS implementation plan

> Execute inline using superpowers:executing-plans. Existing clean primary checkout reused under the declared preference; no additional worktree.

**Goal:** Launch Alloha from YummyAnime into the installed Just Player without a home PC dependency.

**Architecture:** Run the tested upstream Chromium resolver in an isolated Docker service on the existing VPS. A separate HTTPS gateway checks an unguessable access path and uses the existing automatically renewed IP certificate. Configure only YummyAnime's resolver URL on GX1; preserve VPN services and player installation.

**Tech stack:** Node, Playwright 1.64.1, Docker Compose, existing IP TLS certificate, Android Lampa.

**Approved scope:** User selected VPS deployment after the local and VPS-egress 210-second stream checks and a 229-second Just Player playback check. Source evidence is in C:/projects/home/diagnostics/alloha-2026-11-07/findings.json.

## Constraints

- No changes to existing VPN listeners, routes, keys, certificates or containers.
- Public HTTPS port 18443; backend stays on the private Docker network.
- Do not put the generated access token or private device settings into Git or logs.
- Reuse /root/cert/ip read-only; reload renewed certificates without changing renewal jobs.
- Keep the current Just Player APK, playback preferences and Lampa history.

## Tasks

- [x] Test then implement an explicit public playback base so HTTPS and the gateway prefix survive in resolved URLs and every nested playlist.
- [x] Test then implement gateway access checks, path forwarding, streaming and certificate reload; add bounded Docker deployment configuration.
- [x] Review, deploy to /opt/home-alloha, verify certificate, denied anonymous access, authorized health, resource limits and container recovery.
- [x] Record the prior resolver setting, configure YummyAnime on GX1, launch the user's Alloha title from Lampa, observe playback beyond token refresh, and record rollback and cleanup.

## Review focus

- Nested HLS references must remain behind HTTPS and the access path.
- Wrong, missing and ambiguous access prefixes must never reach the backend.
- Certificate renewal must replace the TLS context without interrupting existing streams.
- A stopped or restarted backend must yield a bounded gateway error and recover.
- A source's selected/default audio must remain consistent with the episode offered by Lampa.

## Ledger

- Baseline: resolver-server.test.js passes; source checkout clean at 658b0af.
- Ruling: reuse the primary checkout rather than allocate a worktree, per the session's checkout preference. All changes are server-side; plugin distribution bytes are not rebuilt unless a live integration defect requires it.
- Task 1: complete. Public-base tests failed before export/implementation and pass with HTTPS path preservation and invalid-base rejection.
- Task 2: complete. Gateway tests failed before implementation; access, streaming path/range forwarding, certificate context replacement and backend failure pass. Audio test reproduced cross-track selection and now pins the default track.
- Ruling: pin deployment and dependency to Playwright 1.64.1, the current documented Docker release, instead of shipping the old 1.49.1 Chromium. Alloha acquisition and long playback will be rechecked inside the deployed image.
- Review: an interrupted upstream stream left downstream open. A failing truncated-response test reproduced this; incoming aborted/error and post-header proxy failures now destroy downstream. Repeat review found no material remaining issue.
- Deployment: HTTPS port 18443 is live; anonymous health is 404, authorized health is 200 with valid TLS. Cold Alloha resolve took 2.01 seconds. Real 210-second media-copy check passed (210.043 media seconds, 212.53 seconds elapsed).
- Ruling: sandbox launch failed at sys_chroot with all capabilities dropped. Restoring only SYS_CHROOT fixed it; Chromium sandbox stays enabled and no host settings were changed.
- Validation: 108/108 tests pass with Node's global navigator disabled to match the test harness browser assumptions. Existing VPN container IDs and x-ui active state match the saved baseline.
- Device: previous resolver URL was empty; new private HTTPS URL saved through Lampa UI. Original title, Alloha multivoice, episode 1 launched from Watch into installed Just Player. Playback remained PLAYING without error at 229829 ms with 282282 ms buffered. User confirmed normal picture and sound.

- Completion: gateway restart recovered; deployed source hashes match local files. No temporary tunnels/forwards or worktrees remain. Primary checkout retained; private evidence and prior empty setting are outside Git under diagnostics.
