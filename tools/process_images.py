"""
CARA PAKAI:
1. Taruh foto asli (JPG/PNG) ke folder original/{kategori}/{subkategori}/
   Contoh: original/love-package/wedding/DSC_001.JPG

2. Jalankan dari root project:
   python3 tools/process_images.py

3. Script otomatis resize (900/1600/2560px), convert ke WebP, simpan ke
   assets/images/{kategori}/{subkategori}/, dan menambah entry baru ke
   data/gallery-manifest.json dengan "featured": false secara default.

4. Buka data/gallery-manifest.json, cari entry baru, ubah "featured": false
   menjadi "featured": true untuk foto yang ingin masuk kurasi gallery "ALL".

   Contoh SEBELUM:
   { "id": "love-package-wedding-dsc001", ..., "featured": false }

   Contoh SESUDAH:
   { "id": "love-package-wedding-dsc001", ..., "featured": true }

OPSI TAMBAHAN:
   python3 tools/process_images.py --quality 85     (ubah kualitas WebP)
   python3 tools/process_images.py --force            (proses ulang semua)
   python3 tools/process_images.py --dry-run          (lihat tanpa eksekusi)
"""

import os
import sys
import json
import re
import argparse
from pathlib import Path
from datetime import datetime
from PIL import Image, ImageOps

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
TARGET_SIZES = [900, 1600, 2560]

def sanitize_filename(stem: str) -> str:
    """Sanitize filename stem to lowercase alphanumeric slug."""
    clean = re.sub(r'[^a-z0-9]', '', stem.lower())
    return clean if clean else 'image'

def get_orientation(width: int, height: int) -> str:
    if width > height:
        return 'landscape'
    elif height > width:
        return 'portrait'
    else:
        return 'square'

def process_single_image(src_path: Path, output_dir: Path, slug_prefix: str, target_sizes: list, quality: int, force: bool, dry_run: bool):
    """
    Process an image: transpose EXIF, determine orientation, resize, and save to WebP.
    Returns: (orientation, sizes_processed, skipped)
    """
    # Open image to get size and orientation
    with Image.open(src_path) as img:
        img = ImageOps.exif_transpose(img)
        w, h = img.size
        orientation = get_orientation(w, h)
        max_edge = max(w, h)

        # Determine target sizes that don't upscale
        valid_sizes = [s for s in target_sizes if s <= max_edge]
        # If original image is smaller than smallest target, at least include smallest size or keep as is without upscale
        if not valid_sizes and target_sizes:
            valid_sizes = [min(target_sizes)]

        expected_outputs = [output_dir / f"{slug_prefix}-{s}.webp" for s in valid_sizes]

        # Check idempotency
        if not force and all(out.exists() for out in expected_outputs):
            return orientation, len(valid_sizes), True

        if not dry_run:
            output_dir.mkdir(parents=True, exist_ok=True)
            for size, out_path in zip(valid_sizes, expected_outputs):
                # Calculate new dimensions
                if w >= h:
                    new_w = size
                    new_h = int(round(h * (size / w)))
                else:
                    new_h = size
                    new_w = int(round(w * (size / h)))

                resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                
                # Convert palette / RGBA if saving WebP
                if resized.mode in ('RGBA', 'LA') or (resized.mode == 'P' and 'transparency' in resized.info):
                    mode_to_save = resized.convert('RGBA')
                else:
                    mode_to_save = resized.convert('RGB')
                
                mode_to_save.save(out_path, 'WEBP', quality=quality)

        return orientation, len(valid_sizes), False

def main():
    parser = argparse.ArgumentParser(description="Silent Memory Image Processor & Gallery Manifest Generator")
    parser.add_argument('--quality', type=int, default=82, help="WebP quality (default: 82)")
    parser.add_argument('--force', action='store_true', help="Force re-processing of all images")
    parser.add_argument('--dry-run', action='store_true', help="Preview actions without modifying files")
    args = parser.parse_args()

    root_dir = Path(__file__).resolve().parent.parent
    original_dir = root_dir / 'original'
    assets_dir = root_dir / 'assets' / 'images'
    manifest_path = root_dir / 'data' / 'gallery-manifest.json'

    if not original_dir.exists():
        print(f"Error: Folder '{original_dir}' tidak ditemukan.")
        sys.exit(1)

    # Scan recursive
    image_files = []
    for root, _, files in os.walk(original_dir):
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in SUPPORTED_EXTENSIONS:
                image_files.append(Path(root) / f)

    image_files.sort()

    processed_count = 0
    skipped_count = 0
    warnings = []

    # Read existing manifest
    manifest_items = []
    if manifest_path.exists():
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest_items = json.load(f)
        except Exception as e:
            warnings.append(f"Gagal membaca gallery-manifest.json: {e}")

    manifest_map = {item['id']: item for item in manifest_items if isinstance(item, dict) and 'id' in item}
    scanned_ids = set()
    new_manifest_count = 0
    updated_manifest_count = 0

    for src_path in image_files:
        rel_path = src_path.relative_to(original_dir)
        parts = rel_path.parts

        if not parts:
            continue

        filename_stem = src_path.stem
        clean_file_stem = sanitize_filename(filename_stem)

        # Special handling for team photos: original/team/name.jpg
        if parts[0] == 'team':
            team_member_name = clean_file_stem
            out_dir = assets_dir / 'team'
            slug_prefix = team_member_name
            
            try:
                _, _, skipped = process_single_image(
                    src_path, out_dir, slug_prefix, TARGET_SIZES, args.quality, args.force, args.dry_run
                )
                if skipped:
                    skipped_count += 1
                else:
                    processed_count += 1
            except Exception as e:
                warnings.append(f"Gagal memproses foto tim '{rel_path}': {e}")
            continue

        # Regular portfolio photos
        if len(parts) >= 3:
            category = parts[0]
            subcategory = parts[1]
            out_dir = assets_dir / category / subcategory
            slug = f"{category}-{subcategory}-{clean_file_stem}"
            src_manifest_path = f"{category}/{subcategory}/{slug}"
        elif len(parts) == 2:
            category = parts[0]
            subcategory = None
            out_dir = assets_dir / category
            slug = f"{category}-{clean_file_stem}"
            src_manifest_path = f"{category}/{slug}"
        else:
            warnings.append(f"File '{rel_path}' berada di luar struktur folder category: diabaikan.")
            continue

        scanned_ids.add(slug)

        try:
            orientation, _, skipped = process_single_image(
                src_path, out_dir, slug, TARGET_SIZES, args.quality, args.force, args.dry_run
            )
            if skipped:
                skipped_count += 1
            else:
                processed_count += 1

            # Update manifest entry
            if slug in manifest_map:
                entry = manifest_map[slug]
                entry['category'] = category
                entry['subcategory'] = subcategory
                entry['orientation'] = orientation
                entry['src'] = src_manifest_path
                updated_manifest_count += 1
            else:
                new_entry = {
                    "id": slug,
                    "src": src_manifest_path,
                    "category": category,
                    "subcategory": subcategory,
                    "media_type": "photo",
                    "orientation": orientation,
                    "year": datetime.now().year,
                    "featured": False
                }
                manifest_map[slug] = new_entry
                manifest_items.append(new_entry)
                new_manifest_count += 1

        except Exception as e:
            warnings.append(f"Gagal memproses gambar '{rel_path}': {e}")

    # Check for missing source files in manifest
    for item_id, item in manifest_map.items():
        if item_id not in scanned_ids:
            # Check if this item belongs to category scanned from original/
            warnings.append(f"Manifest entry ID '{item_id}' ({item.get('src')}) tidak memiliki file sumber di original/.")

    # Save manifest if not dry-run
    if not args.dry_run:
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        # Convert list preserving order
        ordered_manifest = list(manifest_map.values())
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(ordered_manifest, f, indent=2, ensure_ascii=False)
            f.write('\n')
            
        js_manifest_path = root_dir / 'data' / 'gallery-manifest.js'
        with open(js_manifest_path, 'w', encoding='utf-8') as f:
            f.write('window.GALLERY_MANIFEST = ')
            json.dump(ordered_manifest, f, indent=2, ensure_ascii=False)
            f.write(';\n')

    # Summary Output
    print("\n" + "="*50)
    print("RINGKASAN PROSES FOTO & MANIFEST")
    print("="*50)
    print(f"Foto diproses (generate/resize) : {processed_count}")
    print(f"Foto di-skip (sudah ada)        : {skipped_count}")
    print(f"Manifest entry baru             : {new_manifest_count}")
    print(f"Manifest entry diupdate         : {updated_manifest_count}")
    print(f"Total manifest entries          : {len(manifest_map)}")

    if warnings:
        print("\n[WARNINGS / PERHATIAN]:")
        for w in warnings:
            print(f" - {w}")
    print("="*50 + "\n")

if __name__ == '__main__':
    main()
