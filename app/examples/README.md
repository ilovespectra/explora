# Sorta Example Scripts 📚

This folder contains example bash scripts demonstrating different ways to use Sorta for file organization.

## Prerequisites

Make sure you've:
1. Installed dependencies: `npm install`
2. Built the project: `npm run build` (if needed)
3. Made scripts executable: `chmod +x examples/*.sh`

## Important Notes ⚠️

### Before Running ANY Sorta Scripts:

1. **Always edit the paths** in these scripts to match your actual directories
2. **Always run `create-metadata.ts` FIRST** (except for `sorta.ts` and `sorta-by-name.ts`)
3. **Test on a small folder first** before running on important data
4. **Backup your data** - some scripts MOVE files (they won't be in the original location anymore)

## 🆕 Hard Drive Migration (RECOMMENDED for Full Drive Copy!)

**For migrating an entire old hard drive to a new one:**

```bash
./examples/hdd-migration.sh
```

**Features:**
- ⭐ Interactive drive selection and validation
- ✅ Automatic metadata creation with retry logic
- 🔄 Resume capability if interrupted
- 📊 Real-time progress tracking
- 🔍 Verification after completion
- 🛡️ Safe COPY mode (originals remain on source)

**See [HDD-MIGRATION-GUIDE.md](HDD-MIGRATION-GUIDE.md) for complete documentation**

---

## Which Script to Use?

| Use Case | Script to Run | Creates Metadata? | Moves or Copies? |
|----------|---------------|-------------------|------------------|
| **Full hard drive migration** | `hdd-migration.sh` | Auto-creates | Copies |
| Complete phone backup | `organize-phone-backup.sh` | Yes | Moves |
| Photos from camera | `organize-photos-only.sh` | Yes | Moves |
| Messy downloads folder | `organize-downloads-folder.sh` | Yes | Moves |
| Quick file sort | `quick-copy-by-extension.sh` | No | Copies |
| External drive cleanup | `external-drive-backup.sh` | Yes | Moves |
| Video collection | `video-archive.sh` | Yes | Moves |
| Debug/test file info | `inspect-files.sh` | No | Neither |

## How to Run

1. **Edit the script** to set your source and destination paths:
   ```bash
   nano examples/organize-photos-only.sh
   # Change SOURCE_DIR and DEST_DIR to your paths
   ```

2. **Make it executable** (first time only):
   ```bash
   chmod +x examples/organize-photos-only.sh
   ```

3. **Run the script**:
   ```bash
   ./examples/organize-photos-only.sh
   ```

## What Gets Created?

### Metadata File (`file_metadata.json`)
Created in the project root directory:
```json
{
  "files": [
    {
      "filename": "photo.jpg",
      "path": "/full/path/to/photo.jpg",
      "timestamp": "2024-06-15T10:30:00.000Z",
      "copied": false,
      "hash": "a3f2c8b9..."
    }
  ]
}
```

### Organized Folder Structure
```
destination/
├── images/
│   ├── jpg/
│   │   ├── 2024-06-15_vacation_photo.jpg
│   │   └── 2024-06-16_beach_sunset.jpg
│   ├── png/
│   └── heic/
├── videos/
│   ├── mp4/
│   ├── mov/
│   └── avi/
├── audio/
│   ├── mp3/
│   └── flac/
└── [other file type folders]/
```

## Tips & Tricks

### For Large Folders
- Run overnight for folders with 10,000+ files
- Metadata creation can take 10-30 minutes on large drives
- Progress bars show real-time status

### For Duplicate Management
- The scripts report how many MB of duplicates were skipped
- Duplicates are detected by SHA-256 hash (100% accurate)
- First occurrence is kept, subsequent duplicates are skipped

### For Screenshots
- Use `sorta-by-name.ts` if you want ALL screenshots in one folder
- It searches for "screenshot" in filenames (case-insensitive)

### Testing Before Big Runs
Create a test folder:
```bash
mkdir ~/sorta_test
cp -r ~/Downloads/* ~/sorta_test/  # Copy some test files
# Edit script to use ~/sorta_test as source
./examples/organize-downloads-folder.sh
```

## Customizing

You can create your own scripts by mixing and matching:

```bash
#!/bin/bash
# Custom: Only images and videos from vacation folder

SOURCE="/Volumes/SD_Card/Vacation2024"
DEST="$HOME/Pictures/Vacation2024"

ts-node src/app/pages/api/create-metadata.ts "$SOURCE"
ts-node src/app/pages/api/sorta-pics.ts "$SOURCE" "$DEST"
ts-node src/app/pages/api/sorta-vids.ts "$SOURCE" "$DEST"
```

## Troubleshooting

### "Permission denied" errors
- Use `sudo` if organizing system directories (not recommended)
- Check folder permissions: `ls -la /path/to/folder`

### "Metadata file not found"
- Make sure you ran `create-metadata.ts` first
- Check that `file_metadata.json` was created in the project root

### Files not being found
- Check that file extensions are in the extension lists
- Look at the TypeScript files to see supported formats

### Need more help?
- Check the main README.md
- Run inspect.ts to debug file metadata issues
- Review the console output for specific error messages
