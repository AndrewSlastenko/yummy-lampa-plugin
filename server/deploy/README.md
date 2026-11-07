# Alloha resolver deployment

This deployment serves the YummyAnime resolver through HTTPS on port 18443. It uses the existing VPS IP certificate, keeps Chromium in a non-root isolated container, and protects every public endpoint with a randomly generated access path. The resolver port is not published.

Chromium's sandbox needs `SYS_CHROOT` with the bundled seccomp profile. All other container capabilities are dropped; no host-wide sandbox or kernel setting is changed.

Copy `.env.example` to `.env`, generate a new 32-byte hexadecimal token, and set the public host. Keep `.env` private. The existing IP certificate directory must contain `fullchain.pem` and `privkey.pem`. The gateway rereads the certificate every hour, so existing ACME renewal remains in control.

From this directory, run `docker compose up -d --build`. Enter `https://PUBLIC_HOST/ACCESS_TOKEN` in Lampa Settings → YummyAnime → Resolver server. Never publish this URL or include it in ordinary logs.

Check authorized `/health`, denied anonymous `/health`, valid TLS, successful `/resolve`, and playback longer than the source token lifetime. Restarting the resolver drops current source sessions; reopening the episode obtains a fresh one.

For rollback, restore the previous resolver URL in Lampa and run `docker compose down` in this directory. This project does not alter existing VPN listeners, certificates or routing. The included seccomp profile is from the pinned Playwright v1.64.1 Docker distribution.
