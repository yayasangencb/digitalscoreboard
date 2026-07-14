Fitur Bagan Turnamen ini sangat besar. Saya usulkan pendekatan bertahap agar hasil awal cepat berjalan dan bisa diperluas ke jenis bagan lain, controller kedua, dan integrasi penuh scoreboard di iterasi berikutnya.

## Fase 1 — Fondasi (yang akan saya kerjakan sekarang)

**Database (migrasi Lovable Cloud)**
- `brackets` — id, tournament_id, name, category, bracket_type, participant_count, theme_id, background_url, logo_url, animation_type, animation_speed, auto_tour_enabled, display_mode, operator_name, scheduled_date, location, table_count, created_by, timestamps.
- `bracket_participants` — id, bracket_id, name, team, photo_url, seed_number, initial_position, status.
- `bracket_matches` — id, bracket_id, round_number, match_number, position_in_round, player_one_id, player_two_id, score_player_one, score_player_two, winner_id, next_match_id, next_match_position ('top'|'bottom'), scoreboard_match_id, table_number, scheduled_at, match_status.
- `bracket_display_sessions` — id, bracket_id, session_code, current_focus, animation_status, zoom_level, pan_x, pan_y, display_mode, last_updated_by.
- RLS: read publik untuk display; write hanya untuk operator/admin.
- GRANT ke authenticated + service_role (+ anon SELECT untuk display publik).

**Menu & Route**
- Sidebar menu baru "Bagan Turnamen" dengan sub-item: Buat Bagan, Kelola Bagan.
- Route:
  - `/_authenticated/brackets` — daftar bagan (Kelola).
  - `/_authenticated/brackets/create` — form pembuatan.
  - `/_authenticated/brackets/$id/edit` — editor interaktif.
  - `/brackets/$id/preview` — halaman preview animasi (auth, tapi preview device size).
  - `/brackets/$id/display` — display publik fullscreen (SSR off, tanpa auth agar bisa dibuka di proyektor via kode).

**Logika Single Elimination (`src/lib/bracket-logic.ts`)**
- Hitung jumlah round dari participant_count (bulatkan ke power of 2, dengan bye).
- Generator pertandingan lengkap dengan link `next_match_id` + posisi.
- Fungsi seeding: manual, acak, seeded standar (1 vs N, 2 vs N-1, dst.).
- Fungsi setWinner(matchId, winnerId) → set winner + propagasi ke match berikutnya.
- Layout math: posisi X/Y setiap kotak untuk SVG bracket (horizontal, final di tengah/kanan sesuai referensi).

**Form Buat Bagan** (`brackets/create`)
- Field: nama turnamen, kategori, jenis bagan (default Single Elimination, lainnya "Segera"), jumlah peserta (4/8/16/32/64/custom), tanggal, lokasi, jumlah meja, logo, background, tema, operator.
- Input peserta: list nama + tim, tombol Tambah, Acak, Reset, Import Excel (CSV sederhana), Ambil dari database (opsional Fase 2).
- Tombol Simpan Draft, Buat Bagan → generate matches, redirect ke editor.

**Editor Bagan** (`brackets/$id/edit`)
- Kanvas bagan SVG interaktif dengan zoom & pan.
- Drag & drop peserta antar slot babak 1 (dnd-kit).
- Klik kotak → panel samping: edit nama, nomor meja, jadwal, skor manual, tandai pemenang, buka scoreboard.
- Toggle: tampilkan skor, foto, logo tim; ketebalan garis; jarak antarbabak; warna kotak.
- Real-time sync via Supabase channel.

**Preview** (`brackets/$id/preview`)
- Pilihan viewport (Desktop, 1366×768, 1920×1080, Proyektor, Tablet, Mobile landscape) dengan frame terskala.
- Tombol: Play, Pause, Restart, Fullscreen, Kecepatan (0.5×–2×), Jenis Pergerakan, Fokus Babak.

**Display** (`brackets/$id/display`)
- Fullscreen, tanpa chrome, cursor auto-hide, shortcut (F, Space, R, ←/→, A, H).
- Dua mode: Informasi (auto-tour loop) dan Live (fokus ke pertandingan aktif).
- Realtime update saat winner berubah.

**Animasi (Framer Motion + SVG)**
- Tahap 1: background fade in, logo scale, judul slide down.
- Tahap 2: kotak peserta staggered slide dari sisi luar → tengah (100–200 ms jeda).
- Tahap 3: SVG path drawing (stroke-dasharray) untuk garis penghubung, berurutan per babak.
- Tahap 4: babak berikutnya muncul setelah garis selesai.
- Tahap 5: kotak juara glow, scale lembut, confetti opsional, label "JUARA".
- Update pemenang real-time: skor berkedip, kotak kalah redup, garis menyala, nama pindah ke kotak berikutnya, pulse.
- Pilihan animasi kotak (Fade/Slide/Zoom/Flip/Stagger) & garis (Draw/Flow/Pulse/Glow/Static).
- Auto-tour kamera dengan CSS transform (translate + scale) smooth.

**Integrasi Scoreboard**
- Tombol "Buka Scoreboard" di kotak → buat `matches` row (nama pemain otomatis, target 11, best_of 5) dan simpan `scoreboard_match_id`.
- Saat match scoreboard selesai (winner terset), trigger update `bracket_matches` → propagasi ke next match.
- Dialog konfirmasi "Hasil akan memasukkan X ke babak berikutnya. Lanjutkan?" dengan opsi Konfirmasi/Koreksi/Batal.

**Responsive & Mini-map**
- Desktop/proyektor: struktur lengkap dengan zoom.
- Tablet/mobile: pan/drag, pinch-zoom (via wheel + touch), tombol zoom, mini-map kanan bawah.

**Data Dummy**
- Preview default 8 peserta (Ahmad, Budi, Candra, Dimas, Eko, Fajar, Galih, Hendra) jika bagan kosong.

## Fase 2 — Ditunda (setelah Fase 1 disetujui/dites)
- Double Elimination, Round Robin, Group→Knockout.
- Controller perangkat kedua (`/brackets/$id/controller`) via `bracket_display_sessions`.
- Import Excel penuh (xlsx), ambil dari database pemain terpusat.
- Auto-tour konfigurasi kamera per-babak lanjutan.
- Optimasi virtualisasi untuk 128+ peserta.

## Catatan Teknis
- Tambah dependency: `framer-motion`, `@dnd-kit/core`, `@dnd-kit/sortable`.
- Struktur `bracket-logic.ts` murni fungsional agar mudah diuji dan diperluas ke tipe bagan lain (interface `BracketEngine`).
- Semua warna via design token; tema mengikuti tabel `themes` yang sudah ada.
- Menggunakan gambar referensi Anda sebagai acuan: layout dua sisi mengarah ke tengah (trophy di tengah), palet biru navy + oranye/merah aksen, garis tipis lengkung ke tengah, animasi masuk dari sisi luar menuju tengah.

Apakah saya lanjut kerjakan Fase 1 seperti di atas, atau ada bagian yang ingin dipangkas/diprioritaskan lain? (Fase 1 saja sudah cukup besar — kira-kira 15–20 file baru + 1 migrasi.)