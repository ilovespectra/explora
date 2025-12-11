# Quick Start: Sorta File Organizer

## 🚀 3-Step Usage

### 1️⃣ Open Sorta
```
CRT File Explorer → Tools → Sorta File Organizer
```

### 2️⃣ Select Directories
- Click `[SELECT SOURCE]` → Choose messy folder
- Click `[SELECT DESTINATION]` → Choose organized folder

### 3️⃣ Configure & Run
- Check file types to organize (Images, Videos, Audio, etc.)
- Enable options (Skip Duplicates, Add Timestamps)
- Click `[START ORGANIZING]`

## 📊 What It Does

Organizes files like this:

**Before** (Source):
```
messy-folder/
├── photo1.jpg
├── photo2.png
├── song.mp3
├── video.mp4
├── photo1.jpg (duplicate!)
└── document.pdf
```

**After** (Destination):
```
organized/
├── images/
│   ├── jpg/
│   │   └── 2025-12-10_photo1.jpg
│   └── png/
│       └── 2025-12-10_photo2.png
├── audio/
│   └── mp3/
│       └── 2025-12-10_song.mp3
├── videos/
│   └── mp4/
│       └── 2025-12-10_video.mp4
└── documents/
    └── pdf/
        └── 2025-12-10_document.pdf

# photo1.jpg duplicate was skipped!
# Space saved: ~2.5 MB
```

## ⚙️ Options Quick Reference

| Option | What It Does |
|--------|-------------|
| **Images** | Organize JPG, PNG, GIF, etc. |
| **Videos** | Organize MP4, MOV, AVI, etc. |
| **Audio** | Organize MP3, WAV, FLAC, etc. |
| **Documents** | Organize PDF, DOCX, TXT, etc. |
| **Skip Duplicates** | Don't copy identical files (saves space) |
| **Add Timestamps** | Prefix with date: `2025-12-10_filename.ext` |
| **Create Subfolders** | Group by extension: `images/jpg/`, `images/png/` |

## 🎯 Best Practices

✅ **DO**:
- Backup important files first
- Test with small folder (< 100 files)
- Check destination has enough space
- Review log after organizing

❌ **DON'T**:
- Close browser while organizing
- Organize system folders
- Select same folder for source & destination
- Interrupt large operations

## 🔍 Troubleshooting

**Problem**: No files found  
**Solution**: Check that file categories are enabled

**Problem**: Permission denied  
**Solution**: Grant browser permission when prompted

**Problem**: Files not organized  
**Solution**: Check log for errors, verify file extensions

**Problem**: Sorta not showing  
**Solution**: Use Chrome/Edge browser (required)

## 📱 Browser Support

✅ **Works**: Chrome 86+, Edge 86+, Opera 72+  
❌ **Doesn't Work**: Firefox, Safari (yet)

## 🎨 UI Guide

```
┌─────────────────────────────────────────┐
│ $ SORTA - FILE ORGANIZER            [×] │ ← Header
├─────────────────────────────────────────┤
│ // DIRECTORIES                          │
│ [SELECT SOURCE]      No source          │ ← Pick source folder
│ [SELECT DESTINATION] No destination     │ ← Pick destination
├─────────────────────────────────────────┤
│ // FILE CATEGORIES                      │
│ [✓] Images    [✓] Videos    [✓] Audio  │ ← Choose types
│ [✓] Documents [ ] Others                │
├─────────────────────────────────────────┤
│ // OPTIONS                              │
│ [✓] Skip Duplicates  [✓] Add Timestamps│ ← Configure
│ [✓] Create Subfolders                   │
├─────────────────────────────────────────┤
│ // PROGRESS                             │
│ ████████░░░░░░░░░░ 45% (234/520 files) │ ← Watch progress
├─────────────────────────────────────────┤
│ // STATISTICS                           │
│ Processed: 234  Duplicates: 12         │ ← Live stats
│ Space Saved: 45.2 MB                    │
├─────────────────────────────────────────┤
│     [START ORGANIZING]  [CLEAR LOG]    │ ← Action buttons
└─────────────────────────────────────────┘
```

## 📝 Example Workflow

1. **Open Sorta** from Tools menu
2. **Select** Downloads folder as source
3. **Select** Organized folder as destination
4. **Enable** Images, Videos, Audio
5. **Check** Skip Duplicates + Add Timestamps
6. **Click** START ORGANIZING
7. **Wait** for completion (watch progress bar)
8. **Review** log and statistics
9. **Verify** files in destination folder
10. **Delete** or archive source files (optional)

## 🆘 Need Help?

See full documentation:
- **User Guide**: `SORTA_README.md`
- **Technical**: `API_MIGRATION.md`
- **Summary**: `IMPLEMENTATION_SUMMARY.md`

## 🎉 That's It!

Sorta makes file organization **fast**, **automatic**, and **intelligent**.

**Time saved**: 5-10 minutes per folder  
**Duplicates detected**: Saves gigabytes  
**Organization quality**: Perfect sorting every time

Happy organizing! 🗂️✨
