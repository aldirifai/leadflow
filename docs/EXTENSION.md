# Chrome Extension

Extension untuk capture business listings dari Google Maps ke database Leadflow-mu.

## Installation

1. Pastikan backend Leadflow sudah jalan (lokal atau production)
2. Buka Chrome → `chrome://extensions`
3. Toggle "Developer mode" (kanan atas)
4. Klik "Load unpacked"
5. Browse ke folder `extension/` dari clone repo
6. Extension muncul di list, pin ke toolbar untuk akses cepat

## First-time setup

1. Klik icon extension di toolbar → popup terbuka
2. Isi:
   - **API URL**: backend URL kamu, contoh `https://leadflow.aldirifai.com/api` atau `http://localhost:8001/api`
   - **API Key**: sama dengan `API_KEY` di `.env` backend
3. Klik "Save settings"

Settings disimpan di `chrome.storage.local`, persist lintas browser session.

## Cara pakai

### Workflow normal

1. Buka `https://www.google.com/maps`
2. Search bisnis target — contoh: "klinik gigi di Surabaya"
3. Scroll list hasil sampai banyak listing visible (extension hanya capture yang sudah render di DOM)
4. Klik icon extension di toolbar
5. Klik tombol "Capture visible listings"
6. Tunggu sebentar, status akan menunjukkan jumlah inserted/updated dan quota tersisa

### Workflow detail page

Untuk capture lebih lengkap satu bisnis:

1. Klik salah satu listing di Maps untuk buka detail panel
2. Klik icon extension → "Capture current page detail"
3. Akan capture data lengkap dari panel detail (alamat, telepon, website, jam buka, dll)

## Data yang di-capture

Per listing:
- Place ID (unique identifier Google)
- Nama bisnis
- Alamat (kalau ada di listing)
- Nomor telepon (parsed dari listing text)
- Website (kalau dipasang owner di Google Business)
- Kategori (e.g. "Klinik gigi")
- Rating dan jumlah review
- Latitude/longitude (kalau tersedia)

Data tidak di-capture:
- Email (Maps gak expose ini)
- Nama owner perorangan (privacy)
- Review individual

## Quota

Backend menerapkan daily ingest cap (default 200 leads/hari). Kalau kamu hit limit, extension akan dapat error 429. Reset otomatis jam UTC 00:00.

Status quota muncul di popup setelah tiap capture.

## Tips

**Capture lebih banyak per session:** Scroll terus di Maps sebelum klik Capture. Maps lazy-load listings, jadi makin banyak yang ke-render makin banyak yang ke-capture.

**Search tertarget:** "klinik kecantikan Surabaya" lebih bagus dari "klinik" karena Maps prioritasi local + relevant. Combine kategori + lokasi spesifik.

**Hindari rate limit Google:** Jangan terus-menerus scroll sangat cepat dan capture. Google kadang limit IP kalau detect bot pattern. Kalau Maps mulai aneh (CAPTCHA, listing tidak load), istirahat 30-60 menit.

**Re-capture untuk update:** Aman aja capture listing yang sama lagi — extension akan update data existing (alamat, rating, dll) bukan duplicate.

## Troubleshooting

**"Tidak ada listing ditemukan"**: Pastikan kamu di halaman Maps dengan search results visible. Coba scroll dulu untuk load lebih banyak.

**"Gagal connect ke tab. Refresh halaman Maps lalu coba lagi."**: Content script belum inject. Refresh tab Maps (Ctrl+R), tunggu fully loaded, baru klik Capture.

**Error 401 Unauthorized**: API key salah atau belum di-save. Buka popup, pastikan API Key terisi dan match dengan backend.

**Error 429 Too Many Requests**: Daily quota habis. Tunggu reset di UTC midnight, atau naikkan `DAILY_INGEST_LIMIT` di backend `.env`.

**Listing field kosong (telepon, website, kategori):**
- Listing card di Maps memang gak selalu show semua info — kadang harus klik detail dulu
- Coba "Capture current page detail" setelah klik salah satu listing

## DOM scraping caveat

Selectors di `content.js` mengandalkan struktur DOM Google Maps. Google bisa ubah struktur tanpa pemberitahuan.

Kalau extension tiba-tiba gak nge-capture apa-apa setelah update Maps, kamu perlu update selector di `extension/src/content.js`. File ini self-contained dan bisa diiterasi cepat.

Test selector di console Chrome:
```javascript
document.querySelectorAll('[role="article"]').length
```
Kalau return 0, struktur Maps berubah. Inspect element pada listing card untuk lihat selector baru.
