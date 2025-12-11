# SORTA - File Organizer

**Intelligent file organization tool for the CRT File Explorer**

## Overview

Sorta is a powerful file organization tool that automatically categorizes and sorts your files by type, with support for duplicate detection, timestamp prefixing, and customizable organization schemes.

## Features

### 🗂️ Automatic File Categorization
- **Images**: JPG, PNG, GIF, BMP, WebP, HEIC, RAW formats, and more
- **Videos**: MP4, MOV, AVI, MKV, WebM, and other video formats
- **Audio**: MP3, WAV, FLAC, AAC, OGG, M4A, and more
- **Documents**: PDF, DOCX, TXT, RTF, and office documents
- **Archives**: ZIP, RAR, 7Z, TAR, and compressed files
- **Code**: JS, TS, HTML, CSS, Python, Java, and programming files

### ⚡ Smart Organization Options
- **Skip Duplicates**: Uses SHA-256 hashing to detect and skip duplicate files
- **Add Timestamps**: Prefix files with their modification date (YYYY-MM-DD format)
- **Create Subfolders**: Organize files into subfolders by extension
- **Selective Categories**: Choose which file types to organize

### 📊 Real-Time Statistics
- Files processed counter
- Duplicates detected and skipped
- Space saved by skipping duplicates
- Error tracking
- Progress bar with percentage
- Detailed activity log

### 🎯 Browser-Based
- No server required - runs entirely in the browser
- Uses File System Access API for direct file manipulation
- Secure and private - no files uploaded anywhere
- Works with local directories

## Usage

### Getting Started

1. **Open Sorta**
   - Click `Tools` → `Sorta File Organizer` in the menu bar
   - Or press the Sorta button in the toolbar

2. **Select Directories**
   - Click `[SELECT SOURCE]` to choose the directory to organize
   - Click `[SELECT DESTINATION]` to choose where organized files go

3. **Configure Options**
   - Check/uncheck file categories to organize
   - Enable/disable duplicate detection
   - Toggle timestamp prefixing
   - Choose subfolder organization

4. **Start Organizing**
   - Click `[START ORGANIZING]` to begin
   - Watch real-time progress and statistics
   - Review the log for detailed information

### File Organization Structure

When organizing files, Sorta creates this structure:

```
destination/
├── images/
│   ├── jpg/
│   │   ├── 2025-12-10_photo1.jpg
│   │   └── 2025-12-10_photo2.jpg
│   ├── png/
│   └── gif/
├── videos/
│   ├── mp4/
│   └── mov/
├── audio/
│   ├── mp3/
│   └── wav/
└── documents/
    ├── pdf/
    └── docx/
```

### Options Explained

#### File Categories
- **Images**: Organize all image formats
- **Videos**: Organize all video formats
- **Audio**: Organize all audio formats
- **Documents**: Organize PDFs and office files
- **Others**: Catch-all for unrecognized file types

#### Processing Options
- **Skip Duplicates**: Calculate file hashes to detect identical files and skip copying them
  - Saves time and storage space
  - Uses SHA-256 for reliable duplicate detection
  
- **Add Timestamps**: Prefix filenames with modification date
  - Format: `YYYY-MM-DD_originalname.ext`
  - Makes chronological sorting easy
  - Prevents name conflicts
  
- **Create Subfolders**: Group files by extension
  - Each file type gets its own subfolder
  - Example: All JPGs in `images/jpg/`

## Technical Details

### Browser Compatibility
Requires browsers with File System Access API support:
- Chrome/Edge 86+
- Opera 72+
- Not currently supported: Firefox, Safari (as of Dec 2024)

### Performance
- Processes files asynchronously for better performance
- SHA-256 hashing for duplicate detection
- Memory-efficient streaming for large files
- Progress tracking without blocking UI

### Security
- All processing happens in the browser
- No server uploads or external API calls
- Requires explicit user permission for directory access
- Read-only access to source, write access to destination only

## Migration from CLI Version

The original Sorta was a Node.js CLI tool. This browser version maintains the same core functionality:

**Original CLI Scripts** → **Browser Components**:
- `create-metadata.ts` → Built-in hash calculation
- `sorta-pics.ts` → Images category handler
- `sorta-audio.ts` → Audio category handler
- `sorta-vids.ts` → Videos category handler
- `delete-duplicates.ts` → Integrated duplicate detection
- `sorta.ts` → Main orchestration logic

### Key Differences
- Browser-based instead of Node.js
- File System Access API instead of fs module
- No CLI progress bars (uses browser UI instead)
- No external dependencies (chalk, p-limit, etc.)
- Processes files in-browser without disk I/O overhead

## Tips & Best Practices

### Before Organizing
1. **Backup Important Files**: Always have backups before reorganizing
2. **Test with Small Directory**: Try with a small folder first
3. **Check Destination**: Ensure destination has enough space

### During Organization
1. **Don't Close Browser**: Let the process complete
2. **Monitor Log**: Watch for errors or warnings
3. **Check Statistics**: Verify expected number of files

### After Organization
1. **Verify Results**: Check that files are in correct locations
2. **Review Skipped Files**: Check log for skipped duplicates
3. **Clean Up**: Delete empty source folders if desired

## Troubleshooting

### "Permission Denied"
- Grant browser permission to access directories
- Check if destination is writable
- Try selecting a different destination

### "No Files Found"
- Verify source directory contains supported file types
- Check that file categories are enabled
- Look for hidden files (starts with `.`)

### "Operation Failed"
- Check available disk space
- Verify file permissions
- Try with smaller batch of files

### Browser Not Supported
- Use Chrome, Edge, or Opera
- Update browser to latest version
- Check browser compatibility list

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close Sorta |
| `Enter` | Start organizing (when ready) |
| `Ctrl/Cmd + L` | Clear log |

## API Reference

See `/app/utils/sortaUtils.js` for utility functions:
- `calculateFileHash(file)` - Generate SHA-256 hash
- `collectFiles(directory, options)` - Recursively scan directory
- `copyFileToDestination(file, dest, options)` - Copy with options
- `formatBytes(bytes)` - Human-readable file sizes
- `formatTimestamp(date)` - Date formatting

## Contributing

To add new file categories or improve organization logic, edit:
- `/app/components/SortaOrganizer.js` - Main component
- `/app/utils/sortaUtils.js` - Utility functions
- `/app/components/SortaOrganizer.module.css` - Styling

## Credits

Original CLI tool concept and file categorization logic adapted for browser use.
Designed for the Vintage CRT File Explorer by ilovespectra.

## License

Part of the CRT File Explorer project.
