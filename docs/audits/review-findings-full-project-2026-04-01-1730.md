# Code Review: Full Project (Current Version)

Date: 2026-04-01
Reviewer: AI Agent

## Summary

- Files reviewed: 16
- Issues found: 6 (1 critical, 3 major, 2 minor)

## Critical Issues

- [ ] **[SEC] Force-change-password gate bisa dibypass untuk seluruh API karena whitelist terlalu luas (`"/api"`)** — [proxy.ts](proxy.ts#L16)
      Context: Saat user `mustChangePassword=true`, middleware seharusnya membatasi akses hanya ke route yang dibutuhkan. Namun `changePasswordAllowList` memasukkan `"/api"`, sehingga semua endpoint API tetap bisa diakses.
      Risk: user belum ganti password tetap bisa menjalankan operasi API sensitif.
      Recommendation: ganti whitelist `"/api"` menjadi endpoint spesifik yang benar-benar diperlukan (mis. hanya `"/api/auth/session"` bila dibutuhkan).

## Major Issues

- [ ] **[SEC] Session interceptor me-redirect 401/403 secara global ke login** — [components/session-interceptor.tsx](components/session-interceptor.tsx#L30)
      Context: Semua respons `401` atau `403` memicu `router.push("/login")`.
      Risk: respons `403` (forbidden karena role/branch) diperlakukan sebagai sesi habis, menyesatkan user dan menutupi error akses aktual.
      Recommendation: redirect hanya untuk `401`; untuk `403` tampilkan pesan akses ditolak, jangan paksa logout UX.

- [ ] **[SEC] Base URL email reset dibangun dari header request (origin/host), berisiko host-header poisoning** — [app/forgot-password/action.ts](app/forgot-password/action.ts#L24)
      Context: `buildAppBaseUrl` menggunakan `origin` / `x-forwarded-host` / `host` dari request untuk membentuk link reset.
      Risk: pada deployment/proxy tertentu, header dapat dimanipulasi dan menghasilkan link reset ke domain attacker (phishing vector).
      Recommendation: gunakan env tetap seperti `APP_BASE_URL` dan fallback yang tervalidasi, bukan langsung dari header.

- [ ] **[SEC] Forgot-password belum punya rate limit, rawan abuse email bombing** — [app/forgot-password/action.ts](app/forgot-password/action.ts#L38)
      Context: endpoint kirim email reset tidak membatasi frekuensi per IP/email.
      Risk: spam email ke user valid, biaya meningkat, bisa dipakai untuk DoS ringan pada mail provider.
      Recommendation: terapkan rate limit terdistribusi (mis. Redis/Upstash) per IP + per email, plus cooldown.

## Minor Issues

- [ ] **[ARCH] Login rate limit masih in-memory process-local, tidak konsisten pada multi-instance/serverless** — [lib/rate-limit.ts](lib/rate-limit.ts#L8)
      Context: store memakai global `Map` dalam memory instance.
      Risk: bypass relatif mudah di arsitektur horizontal (setiap instance punya counter sendiri).
      Recommendation: pindahkan ke backend terdistribusi (Redis/KV) agar limit konsisten.

- [ ] **[SEC] Endpoint status sesi publik (`/api/auth/session`) mengungkap status expired tanpa auth** — [app/api/auth/session/route.ts](app/api/auth/session/route.ts#L13)
      Context: endpoint mengembalikan `expired: true/false` untuk siapa pun.
      Risk: rendah, tapi menambah information surface.
      Recommendation: batasi konsumsi endpoint (mis. hanya dipanggil dari protected pages, atau ubah respons jadi lebih minim/opaque).

## Positive Checks (Fixed/Good)

- BNM manager PDF access kini sudah dibatasi branch + status completed — [app/api/reports/[reportNumber]/pdf/route.ts](app/api/reports/[reportNumber]/pdf/route.ts#L80)
- Preview PJUM endpoint sudah disable di production + logging terstruktur — [app/api/preview-pjum/route.ts](app/api/preview-pjum/route.ts#L9)
- Session-expiry popup tidak muncul lagi di forgot/reset routes — [components/session-expiry-alert.tsx](components/session-expiry-alert.tsx#L15)
- Error detail helper sudah sanitasi (tidak expose raw internal detail) — [lib/server-error.ts](lib/server-error.ts#L20)

## Rules Applied

- Security mandate / security principles
- Error handling principles
- Logging and observability principles
- Rule priority
