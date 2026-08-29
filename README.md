# Silent Memory Photography — Website & Visual Portfolio Engine

Sistem web portofolio photography editorial untuk Silent Memory Photography Manado.

---

## Menambahkan Foto Baru

Untuk menambahkan foto portofolio baru ke dalam sistem galeri web, ikuti langkah-langkah berikut:

1. **Simpan Foto Mentah (JPG/PNG)**
   Taruh file foto mentah (`.jpg`, `.jpeg`, atau `.png`) ke dalam struktur folder `original/{category}/{subcategory}/` sesuai kategori portofolio.
   - Contoh untuk kategori Love Package sub-kategori Wedding: simpan foto di `original/love-package/wedding/DSC_001.JPG`.
   - Untuk kategori Commercial yang belum memiliki sub-kategori: simpan foto langsung di `original/commercial/`.
   - Untuk foto anggota tim: simpan foto di `original/team/{nama}.jpg` (contoh: `pierre.jpg`, `chilli.jpg`, `icha.jpg`, `ndee.jpg`).

2. **Jalankan Script Processing**
   Buka terminal di root project dan jalankan script otomatisasi:
   ```bash
   python3 tools/process_images.py
   ```
   *Catatan*: Pastikan virtual environment Python (`.venv`) sudah diaktifkan dan package `Pillow` telah terinstall.

3. **Otomatisasi Resizing & Manifest Merge**
   Script akan secara otomatis:
   - Membuat 3 ukuran responsive WebP (900px, 1600px, 2560px) tanpa melakukan upscaling jika gambar asli lebih kecil.
   - Menyimpan hasil WebP ke folder web `assets/images/{category}/{subcategory}/`.
   - Memasukkan metadata foto baru ke `data/gallery-manifest.json` dengan status `"featured": false` secara default.

4. **Kurasi Manual Galeri "ALL"**
   Foto baru secara otomatis akan tampil saat pengunjung menyaring (*filter*) kategori spesifiknya. Namun, untuk menampilkan foto tersebut di halaman utama portofolio galeri **"ALL"**, buka `data/gallery-manifest.json`, cari ID foto tsb, lalu ubah nilai `"featured": false` menjadi `"featured": true`.

### Contoh Skenario Lengkap (End-to-End)

Bayangkan tim baru saja menyelesaikan sesi dokumentasi pernikahan untuk klien Sdr. Jonathan & Maria:

1. **Penempatan File**: Tim menyimpan foto hasil edit ke `original/love-package/wedding/jonathan_wedding_01.jpg`.
2. **Eksekusi Script**: Tim menjalankan command `python3 tools/process_images.py`.
3. **Hasil Generate**:
   - Dibuat file WebP di `assets/images/love-package/wedding/love-package-wedding-jonathanwedding01-900.webp`, `-1600.webp`, dan `-2560.webp`.
   - Entry baru ditambahkan di `data/gallery-manifest.json`:
     ```json
     {
       "id": "love-package-wedding-jonathanwedding01",
       "src": "love-package/wedding/love-package-wedding-jonathanwedding01",
       "category": "love-package",
       "subcategory": "wedding",
       "media_type": "photo",
       "orientation": "landscape",
       "year": 2026,
       "featured": false
     }
     ```
4. **Kurasi Galeri**: Kurator membuka `data/gallery-manifest.json`, mengubah `"featured": false` menjadi `"featured": true`, dan menambahkan judul. Foto kini resmi muncul di galeri "ALL" dan galeri "Love Package > Wedding".

### Opsi CLI Argument

- Ubah kualitas WebP (default 82): `python3 tools/process_images.py --quality 85`
- Paksa regenerasi semua foto: `python3 tools/process_images.py --force`
- Mode simulasi tanpa mengubah file: `python3 tools/process_images.py --dry-run`
