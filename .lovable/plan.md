## SameThing. — Core MVP (Mobile-first Web + PWA)

Stack: TanStack Start + Lovable Cloud (Postgres + Auth + Edge Functions + Realtime) + OpenRouter (owl).

### 1. Design System
- `src/styles.css` tokenları: `--black #0a0a0a`, `--cream #ede9e0`, `--accent #c8b8a2`, `--card-bg #1a1917`, `--same #d4c5a9`, `--nah #3a3835` (hepsi oklch'e çevrilir).
- Fontlar: Instrument Serif (headings, italic vurgu), DM Sans (UI). Google Fonts üzerinden.
- Marka logosu component: `SameThing.` — nokta her zaman `--accent`.
- Mobile-first dark tema. PWA manifest + ikonlar (manifest-only, offline yok).

### 2. Database (migration)
- `profiles` (id ↔ auth.users, username, emoji, bio, language, is_anon, last_post_at, last_comment_at, rare_thing_count, echo_chamber_warned_at)
- `things` (id, user_id, raw_text, title, simplified_text, language, tags, is_anonymous, is_open_to_chat, similarity_score, same_count, nah_count, total_votes, comment_count, safety_flag, hidden, is_rare_thing, rare_locked_at, created_at)
- `votes` (post, user UNIQUE, vote_type)
- `comments` (id, thing_id, user_id, text, is_anonymous, created_at)
- `reports` (id, target_type [thing|comment], target_id, reporter_id, reason, created_at)
- `user_roles` + `app_role` enum + `has_role()` SECURITY DEFINER (moderation için temel).
- Trigger: yeni auth.users → profile satırı oluştur (random emoji, username = email prefix).
- Trigger: vote insert/delete → things.same_count/nah_count/total_votes/similarity_score yeniden hesapla.
- Realtime: things tablosu publication'a eklenir (canlı oy sayısı için).
- RLS: hepsi açık; things SELECT herkese (hidden=false), INSERT/UPDATE sadece sahibe; vote/comment authenticated; profiles SELECT herkese.

### 3. Auth
- Email/şifre + Google (Lovable broker via `lovable.auth.signInWithOAuth("google")`, `configure_social_auth` ile etkinleştir).
- `/auth` sayfası: tab'lı Sign in / Sign up.
- `_authenticated` layout korumalı sayfalar için (drop, settings, my-things).
- Onboarding modalı: ilk girişte 3 ekran (Welcome → How Same/Nah works → Pick emoji+username) — `profiles.onboarded_at` ile takip.

### 4. AI (OpenRouter owl) — Edge function
- Secret: `OPENROUTER_API_KEY` (kullanıcıdan istenecek).
- Edge function `simplify-thing`: input `{raw_text}` → tek call ile JSON döner: `{simplified_text, language, safety_flag, suggested_title}`.
  - Prompt: simplify rules + language detect + safety check (suicide/self-harm/violence boolean) + raw 80 karakter altıysa title aynen kullanılır.
- Edge function `embed-thing` (opsiyonel, MVP'de pas).
- Client'tan asla direkt çağrılmaz; her zaman edge function.

### 5. Rate limiting (server-side)
- Profile'da `last_post_at`, `last_comment_at`. Drop / comment server function'unda son işlemden bu yana ≥ N saniye kontrolü (post: 60s, comment: 15s). Aşılırsa toast.

### 6. Server logic (TanStack `createServerFn`)
- `dropThing` — rate-limit check → simplify edge function çağır → title yoksa simplified'dan üret → insert → return.
- `voteOnThing` — upsert vote → trigger sayıları günceller → güncel thing dön.
- `addComment` — rate-limit → insert.
- `reportTarget` — reports'a insert.
- `getFeed({filter, lang, cursor})` — language filter (`global` veya kullanıcının dili), tag filter, similarity-weighted ranking + recency.
- `getMyThings`, `getThingById`, `getComments`.

### 7. Sayfalar
- `/` — landing/feed (auth gerekmez; vote/comment için CTA "Sign in").
- `/auth` — sign in/up.
- `/_authenticated/drop` — "Drop a Thing" (textarea, debounced AI preview, title input opsiyonel, anonymous + open-to-chat toggle, tag chips).
- `/thing/$id` — detay: yorumlar + Same/Nah + report menüsü.
- `/_authenticated/me` — MyThings + Rare Thing rozetleri + ayarlar (dil, emoji).
- Bottom tab nav: Feed · Drop · MyThing · Settings (chat sonraki sürümde).

### 8. Badge / Rare Thing mantığı
- "You're the only one" rozeti: `total_votes ≥ 1 && same_count === 0` (canlı).
- Rare Thing: günde 1 kez çalışan pg_cron job (`/api/public/hooks/finalize-rare-things`) → 7 günden eski, hâlâ same_count=0 ve total_votes≥1 olan thing'leri `is_rare_thing=true, rare_locked_at=now()` yap; ileride birisi Same dese bile artık kalıcı. Profilde sayaç.

### 9. Similarity Score etiketleri (yeniden yazıldı)
- 0% → "Just you, in this universe."
- 1–30% → "A small, quiet club."
- 31–60% → "More common than you thought."
- 61–85% → "You're far from alone."
- 86–100% → "A near-universal feeling."

### 10. Featured card mantığı
- Sadece son 24 saatte oluşturulan ve total_votes ≥ 10 olan thing'ler arasından **same_count/log(saat_yaşı+2)** skoruyla rastgele bir tanesi seçilir (her gün rotasyon). Aynı thing iki gün üst üste featured olamaz.

### 11. Report sistemi
- Her kart ve yorumda `⋯` menü → Report. Reason chips: harmful · spam · hate · self-harm risk · other.
- Edge function veya server fn: insert + `safety_flag=true` olan ya da N rapor alan thing'i `hidden=true` yapan basit eşik.

### 12. Share card
- `/thing/$id/share.png` server route → SVG'yi PNG'ye (satori) yerine ilk sürümde sadece güzel bir HTML "share view" sayfası (`/thing/$id/share`) — kullanıcı ekran görüntüsü alabilir. PNG render sonraki iterasyon.

### Teknik detaylar (kısa)
- OpenRouter modeli: `openrouter/owl` veya kullanıcının verdiği tam slug — secret olarak alacağım.
- Diller: feed default kullanıcının `profiles.language`'i (browser'dan default), toggle `global` ile karışık görür.
- Realtime: `things:id` postgres_changes subscription thread sayfasında.
- Tüm UI dark, mobil için max-w-md merkez column + masaüstünde 2-3 kolon grid.

### Sonraki iterasyonlar (bu MVP'ye dahil değil)
Chat (kullanıcı-kullanıcı), pgvector Find, Zaman Kapsülü, ThingTwins, Collective Mood, share PNG, Echo Chamber uyarısı, çok dilli çeviri. Spec'te belirttiğin gibi MVP sonrası eklenecek.

### İlk adımlar (bu turda)
1. Design system + fontlar + marka component + layout iskelet.
2. DB migration (tablolar + RLS + GRANT + triggers + realtime).
3. Google auth'u configure et + auth sayfası.
4. OpenRouter API key secret'ını iste.
5. Edge function `simplify-thing` (OpenRouter call).
6. Server fn'ler + sayfalar.