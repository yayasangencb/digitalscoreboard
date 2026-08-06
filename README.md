# Ace Match Display

Buatkan aplikasi web bernama Digital Scoreboard Tenis Meja untuk menampilkan dan mengatur skor pertandingan tenis meja secara langsung. Aplikasi harus responsif, dapat digunakan di laptop, tablet, dan smartphone, serta dapat ditampilkan secara fullscreen melalui laptop atau proyektor.

1. Tujuan Aplikasi

Aplikasi digunakan sebagai papan skor digital untuk perlombaan tenis meja. Sistem harus mendukung dua cara penggunaan:

Mode 1 Perangkat

Satu laptop digunakan untuk:

Menampilkan papan skor.

Mengatur skor.

Menjalankan timer.

Mengganti set pertandingan.

Menampilkan papan skor ke proyektor.

Mengontrol pertandingan menggunakan keyboard tanpa perlu membuka panel lain.

Pada mode ini, tombol kontrol tidak perlu selalu terlihat ketika papan skor dalam mode fullscreen. Operator dapat mengontrol skor menggunakan shortcut keyboard.

Mode 2 Perangkat

Sistem menggunakan dua perangkat yang terhubung melalui internet atau jaringan yang sama.

Perangkat 1 – Display

Berfungsi sebagai tampilan papan skor.

Dibuka di laptop yang terhubung ke proyektor.

Menampilkan skor secara fullscreen.

Tidak menampilkan tombol pengaturan saat mode display aktif.

Perangkat 2 – Controller

Berfungsi sebagai remote control.

Bisa dibuka melalui laptop, tablet, atau smartphone.

Digunakan untuk menambah dan mengurangi skor.

Mengatur timer, set, nama pemain, servis, dan status pertandingan.

Setiap perubahan dari controller harus langsung tampil di perangkat display secara real-time tanpa reload halaman.

Gunakan sistem Match Code atau Session Code agar perangkat controller dapat terhubung ke perangkat display yang sama.

Contoh:

Operator membuat pertandingan baru.

Sistem menghasilkan kode pertandingan, misalnya TM-4821.

Perangkat display membuka pertandingan dengan kode tersebut.

Perangkat controller login dan memasukkan kode pertandingan yang sama.

Semua perubahan skor langsung tersinkronisasi.

2. Halaman Login

Buat halaman login admin/operator dengan desain modern.

Field login:

Email atau username.

Password.

Tombol masuk.

Opsi ingat saya.

Lupa password.

Setelah login, pengguna diarahkan ke dashboard.

Gunakan autentikasi Supabase.

Role pengguna:

Admin

Mengelola seluruh pertandingan.

Mengelola operator.

Mengelola tema.

Mengelola data perlombaan.

Melihat riwayat pertandingan.

Operator

Membuat pertandingan.

Mengatur skor.

Menggunakan controller.

Membuka tampilan display.

Display

Hanya dapat menampilkan papan skor.

Tidak dapat mengubah data pertandingan.

3. Dashboard Utama

Dashboard memiliki sidebar dan header.

Menu sidebar:

Dashboard.

Pertandingan Aktif.

Buat Pertandingan.

Riwayat Pertandingan.

Tema Scoreboard.

Daftar Operator.

Pengaturan.

Logout.

Pada halaman dashboard tampilkan:

Jumlah pertandingan hari ini.

Pertandingan yang sedang berlangsung.

Pertandingan selesai.

Jumlah pemain.

Tombol cepat “Buat Pertandingan”.

Tombol cepat “Buka Controller”.

Tombol cepat “Buka Display”.

Tampilkan daftar pertandingan dalam bentuk card atau tabel dengan informasi:

Nama pertandingan.

Nama pemain kiri.

Nama pemain kanan.

Nomor meja.

Babak pertandingan.

Skor saat ini.

Status pertandingan.

Kode pertandingan.

Tombol controller.

Tombol display.

Tombol edit.

Tombol hapus.

Status pertandingan:

Belum dimulai.

Sedang berlangsung.

Pause.

Selesai.

4. Form Buat Pertandingan

Buat form untuk membuat pertandingan baru dengan field:

Nama perlombaan.

Kategori pertandingan.

Babak pertandingan.

Nomor meja.

Nama pemain kiri.

Nama tim atau instansi pemain kiri.

Foto pemain kiri, opsional.

Nama pemain kanan.

Nama tim atau instansi pemain kanan.

Foto pemain kanan, opsional.

Jumlah set pertandingan.

Format pertandingan:

Best of 3.

Best of 5.

Best of 7.

Target poin per set, default 11.

Durasi timer, opsional.

Tema scoreboard.

Logo penyelenggara.

Nama venue.

Nama operator.

Catatan pertandingan.

Setelah data disimpan, sistem membuat:

Match ID.

Match Code.

URL controller.

URL display.

Sediakan tombol:

Salin kode pertandingan.

Salin link controller.

Salin link display.

Buka controller.

Buka display.

5. Tampilan Scoreboard

Buat desain scoreboard yang modern, profesional, besar, dan mudah dibaca dari jarak jauh.

Tampilan utama harus memuat:

Logo perlombaan.

Nama perlombaan.

Babak pertandingan.

Nomor meja.

Nama pemain kiri.

Nama tim atau instansi pemain kiri.

Nama pemain kanan.

Nama tim atau instansi pemain kanan.

Skor pemain kiri.

Skor pemain kanan.

Jumlah set yang dimenangkan pemain kiri.

Jumlah set yang dimenangkan pemain kanan.

Indikator pemain yang sedang melakukan servis.

Timer pertandingan.

Status pertandingan.

Riwayat skor setiap set.

Nama venue atau lokasi.

Sponsor, jika tersedia.

Contoh riwayat set:

SetPemain KiriPemain Kanan111827113119

Skor utama harus berukuran sangat besar dan tetap terbaca ketika menggunakan proyektor.

Gunakan layout horizontal:

Pemain kiri berada di sisi kiri.

Informasi pertandingan berada di tengah.

Pemain kanan berada di sisi kanan.

Scoreboard harus mendukung resolusi:

1366 × 768.

1920 × 1080.

Tampilan proyektor.

Laptop.

Tablet.

Smartphone landscape.

6. Mode Fullscreen

Tambahkan tombol fullscreen pada halaman display.

Ketika mode fullscreen aktif:

Sidebar tidak ditampilkan.

Header dashboard tidak ditampilkan.

Cursor dapat disembunyikan setelah beberapa detik tidak bergerak.

Tombol kontrol tidak ditampilkan.

Fokus hanya pada scoreboard.

Tekan Esc untuk keluar dari fullscreen.

Gunakan tombol:

Klik tombol fullscreen.

Shortcut F11.

Shortcut alternatif F.

Catatan: karena browser biasanya mengatur fungsi F11 sendiri, tambahkan juga tombol fullscreen di dalam aplikasi menggunakan Fullscreen API.

7. Controller Pertandingan

Buat halaman controller yang nyaman digunakan melalui laptop dan smartphone.

Controller menampilkan:

Nama pemain kiri.

Nama pemain kanan.

Skor pemain kiri.

Skor pemain kanan.

Set pemain kiri.

Set pemain kanan.

Timer.

Indikator servis.

Status pertandingan.

Match Code.

Status koneksi display.

Tombol utama:

Skor kiri +1.

Skor kiri -1.

Skor kanan +1.

Skor kanan -1.

Mulai timer.

Pause timer.

Reset timer.

Set berikutnya.

Batalkan set terakhir.

Ganti servis.

Tukar posisi pemain.

Reset skor.

Selesaikan pertandingan.

Gunakan tombol yang besar agar nyaman ditekan melalui smartphone.

Tambahkan konfirmasi untuk tindakan penting:

Reset pertandingan.

Membatalkan set.

Menyelesaikan pertandingan.

Menghapus pertandingan.

8. Shortcut Keyboard Mode 1 Perangkat

Tambahkan shortcut keyboard berikut:

Q = skor pemain kiri +1.

A = skor pemain kiri -1.

P = skor pemain kanan +1.

L = skor pemain kanan -1.

Space = mulai atau pause timer.

R = reset skor pertandingan, dengan konfirmasi.

T = reset timer.

S = mengganti pemain yang melakukan servis.

N = lanjut ke set berikutnya.

B = membatalkan set terakhir.

X = tukar posisi pemain kiri dan kanan.

F = masuk atau keluar fullscreen.

Esc = menutup modal atau keluar dari fullscreen.

Ctrl + Z = membatalkan perubahan skor terakhir.

Ctrl + Shift + Z = mengembalikan perubahan yang dibatalkan.

Tampilkan menu bantuan shortcut keyboard melalui:

Tombol ikon keyboard.

Shortcut H.

Modal “Daftar Shortcut”.

Shortcut tidak boleh aktif ketika pengguna sedang mengetik pada input nama pemain atau input lainnya.

9. Aturan Otomatis Tenis Meja

Terapkan aturan skor tenis meja yang dapat diaktifkan atau dinonaktifkan melalui pengaturan pertandingan.

Aturan default:

Satu set dimenangkan ketika pemain mencapai 11 poin.

Pemain harus unggul minimal 2 poin.

Jika skor 10–10, pertandingan masuk kondisi deuce.

Pada kondisi deuce, set berlanjut sampai salah satu pemain unggul 2 poin.

Servis berganti setiap 2 poin.

Saat deuce, servis berganti setiap 1 poin.

Sistem otomatis mendeteksi pemenang set.

Setelah set selesai, skor poin kembali menjadi 0–0.

Jumlah kemenangan set bertambah otomatis.

Sistem menentukan pemenang pertandingan berdasarkan format Best of 3, Best of 5, atau Best of 7.

Contoh:

Best of 3: pemain pertama yang menang 2 set menjadi pemenang.

Best of 5: pemain pertama yang menang 3 set menjadi pemenang.

Best of 7: pemain pertama yang menang 4 set menjadi pemenang.

Ketika set selesai, tampilkan modal:

“Set dimenangkan oleh [Nama Pemain]. Lanjut ke set berikutnya?”

Pilihan:

Lanjut set berikutnya.

Koreksi skor.

Batalkan hasil set.

Ketika pertandingan selesai, tampilkan animasi atau overlay:

“Pemenang Pertandingan: [Nama Pemain]”

Sediakan tombol:

Tutup overlay.

Simpan hasil.

Cetak hasil.

Kembali ke dashboard.

10. Sistem Servis

Tambahkan indikator servis berbentuk:

Ikon bola tenis meja.

Tulisan “SERVE”.

Efek highlight pada sisi pemain yang melakukan servis.

Operator dapat menentukan pemain yang melakukan servis pertama sebelum pertandingan dimulai.

Sistem menghitung pergantian servis otomatis berdasarkan jumlah poin.

Tambahkan tombol manual “Ganti Servis” jika operator perlu melakukan koreksi.

11. Timer

Timer memiliki beberapa mode:

Stopwatch, dimulai dari 00:00 dan terus bertambah.

Countdown, dimulai dari waktu tertentu.

Tanpa timer.

Fitur timer:

Start.

Pause.

Resume.

Reset.

Pengaturan durasi.

Bunyi notifikasi saat waktu habis.

Timer tetap sinkron antara controller dan display.

Timer tidak boleh kembali ke awal saat halaman direfresh.

Pada mode dua perangkat, sumber timer harus berasal dari data waktu server atau timestamp agar waktu pada controller dan display tetap sama.

12. Sinkronisasi Real-Time

Gunakan Supabase Realtime agar semua perubahan langsung tersinkronisasi.

Data yang harus disinkronkan:

Skor pemain kiri.

Skor pemain kanan.

Set pemain kiri.

Set pemain kanan.

Timer.

Status timer.

Pemain yang melakukan servis.

Status pertandingan.

Tema scoreboard.

Nama pemain.

Riwayat set.

Pesan atau overlay pemenang.

Tambahkan indikator koneksi:

Hijau: terhubung.

Kuning: menghubungkan ulang.

Merah: koneksi terputus.

Jika internet terputus:

Controller tetap menyimpan perubahan sementara secara lokal.

Sistem mencoba menyambungkan ulang otomatis.

Setelah terhubung, data disinkronkan kembali.

Hindari skor bertambah dua kali akibat proses sinkronisasi ulang.

13. Tema Berdasarkan Poster

Saya akan mengirimkan poster perlombaan sebagai referensi desain.

Buat sistem agar tema scoreboard dapat disesuaikan berdasarkan poster tersebut.

Elemen desain yang perlu mengikuti poster:

Warna utama.

Warna sekunder.

Warna aksen.

Background.

Bentuk card.

Gaya heading.

Jenis dekorasi.

Logo acara.

Pola visual.

Nuansa perlombaan.

Tambahkan halaman “Tema Scoreboard” agar admin dapat:

Mengunggah poster referensi.

Mengunggah background scoreboard.

Mengunggah logo.

Memilih warna utama.

Memilih warna sekunder.

Memilih warna teks.

Mengatur warna pemain kiri.

Mengatur warna pemain kanan.

Memilih jenis font.

Mengatur ukuran logo.

Mengatur opacity background.

Menampilkan atau menyembunyikan sponsor.

Melihat live preview sebelum tema disimpan.

Sediakan beberapa tema awal:

Modern Sport.

Dark Tournament.

Light Tournament.

Merah Putih.

Biru Profesional.

Tema Custom Berdasarkan Poster.

Jangan membuat desain terlihat seperti dashboard aplikasi ketika dibuka pada mode display. Tampilan display harus terlihat seperti graphic scoreboard profesional untuk sebuah turnamen.

14. Riwayat dan Hasil Pertandingan

Simpan seluruh hasil pertandingan.

Data riwayat:

Tanggal.

Waktu mulai.

Waktu selesai.

Durasi.

Nama pemain.

Hasil setiap set.

Total set.

Pemenang.

Operator.

Nomor meja.

Babak pertandingan.

Tambahkan fitur:

Pencarian pertandingan.

Filter berdasarkan tanggal.

Filter berdasarkan babak.

Filter berdasarkan pemain.

Filter berdasarkan status.

Cetak hasil pertandingan.

Export PDF.

Export Excel.

Hapus riwayat.

Buka ulang detail pertandingan.

15. Struktur Database

Gunakan Supabase dengan tabel berikut:

profiles

id

full_name

email

role

created_at

updated_at

tournaments

id

tournament_name

organizer_name

venue

logo_url

poster_url

theme_id

created_by

created_at

updated_at

matches

id

tournament_id

match_code

category

round_name

table_number

player_left_name

player_left_team

player_left_photo

player_right_name

player_right_team

player_right_photo

score_left

score_right

sets_left

sets_right

best_of

target_score

serving_player

timer_mode

timer_duration

timer_started_at

timer_paused_at

timer_elapsed

match_status

winner

operator_id

started_at

finished_at

created_at

updated_at

match_sets

id

match_id

set_number

score_left

score_right

winner

created_at

score_events

id

match_id

action_type

previous_value

new_value

player_side

operator_id

created_at

themes

id

theme_name

primary_color

secondary_color

accent_color

text_color

left_player_color

right_player_color

background_url

logo_url

font_family

custom_css

created_by

created_at

updated_at

16. Keamanan

Terapkan Row Level Security pada Supabase.

Ketentuan:

Admin dapat mengakses seluruh data.

Operator hanya dapat mengatur pertandingan yang ditugaskan kepadanya.

Display hanya dapat membaca pertandingan berdasarkan Match Code.

Pengguna yang belum login tidak dapat membuka controller.

Display publik tidak boleh mendapatkan akses untuk mengubah skor.

Match Code harus sulit ditebak.

Simpan log setiap perubahan skor.

Gunakan validasi agar skor tidak dapat kurang dari 0.

Cegah dua operator mengubah pertandingan yang sama tanpa pemberitahuan.

Jika terdapat dua controller aktif, tampilkan notifikasi:

“Pertandingan ini sedang dikontrol oleh perangkat lain.”

Admin dapat mengambil alih kontrol.

17. UI dan UX

Gunakan desain:

Modern.

Profesional.

Sporty.

Bersih.

Mudah digunakan.

Tidak terlalu banyak teks.

Tidak terlihat seperti template AI generik.

Menggunakan spacing yang rapi.

Menggunakan icon yang konsisten.

Animasi ringan dan tidak berlebihan.

Dashboard dapat menggunakan:

React.

TypeScript.

Tailwind CSS.

Shadcn UI.

Lucide Icons.

Supabase Authentication.

Supabase Database.

Supabase Realtime.

Untuk tampilan scoreboard, gunakan komponen custom agar desain lebih unik dan tidak terlalu menyerupai tampilan dashboard biasa.

18. Fitur Tambahan

Tambahkan fitur berikut:

Bunyi ketika skor bertambah.

Bunyi berbeda ketika set selesai.

Bunyi ketika pertandingan selesai.

Tombol mute.

Undo dan redo.

Pengaturan volume.

Mode gelap dan terang untuk dashboard.

Auto-hide controller pada mode fullscreen.

QR Code untuk membuka controller melalui smartphone.

QR Code untuk membuka display.

Kunci controller dengan PIN.

Catatan wasit.

Nama wasit.

Tampilan sponsor bergantian.

Running text nama acara.

Preview display sebelum pertandingan dimulai.

Mode latihan tanpa menyimpan hasil.

Duplikasi pertandingan.

Tombol pertandingan berikutnya.

Import daftar pemain dari Excel.

Pengaturan bahasa Indonesia.

Toast notification untuk setiap aksi penting.

19. Alur Penggunaan

Alur Mode Satu Perangkat

Operator login.

Operator membuat pertandingan.

Operator membuka halaman display.

Operator mengaktifkan fullscreen.

Operator mengatur pertandingan menggunakan shortcut keyboard.

Tampilan scoreboard ditampilkan melalui proyektor.

Setelah pertandingan selesai, hasil disimpan.

Alur Mode Dua Perangkat

Operator login melalui perangkat controller.

Operator membuat pertandingan.

Sistem menghasilkan Match Code dan QR Code.

Laptop display membuka URL display.

Laptop display masuk fullscreen dan terhubung ke proyektor.

Smartphone atau laptop operator membuka controller.

Operator mengatur skor melalui controller.

Perubahan tampil secara real-time di display.

Setelah pertandingan selesai, hasil otomatis tersimpan.

20. Halaman yang Harus Dibuat

Buat halaman:

/login

/dashboard

/matches

/matches/create

/matches/:id/edit

/controller/:matchCode

/display/:matchCode

/matches/:id/result

/history

/themes

/operators

/settings

Buat seluruh halaman berfungsi, bukan hanya desain statis.

Gunakan data dummy terlebih dahulu untuk preview, tetapi struktur aplikasi harus siap dihubungkan dengan Supabase.

Pastikan tombol tambah skor, kurang skor, timer, fullscreen, undo, reset, pergantian servis, dan sinkronisasi controller-display benar-benar berfungsi.

Prioritaskan terlebih dahulu:

Login.

Dashboard.

Membuat pertandingan.

Display scoreboard.

Controller.

Mode satu perangkat dengan keyboard.

Mode dua perangkat dengan real-time.

Aturan skor tenis meja otomatis.

Tema berdasarkan poster.

Riwayat pertandingan.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://digitalscoreboard.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/33d6c4ff-5eed-482c-a687-0c7727c97d9a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
