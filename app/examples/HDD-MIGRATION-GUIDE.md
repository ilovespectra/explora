# Hard Drive Migration Guide - Using Sorta v2.0

## 🚀 Quick Start

```bash
# Make the script executable (if not already)
chmod +x examples/hdd-migration.sh

# Run the migration
./examples/hdd-migration.sh
```

---

## 📋 What This Script Does

### Automated Steps:
1. **Disk Detection** - Lists all available drives
2. **Source Selection** - Choose old drive to copy FROM
3. **Destination Selection** - Choose new drive to copy TO
4. **Validation** - Verifies both drives are accessible and have sufficient space
5. **Metadata Creation** - Scans old drive and creates SHA-256 hashes (with 3x retry logic)
6. **Migration** - Copies files from old to new drive
7. **Resume Support** - If interrupted, resume from exact point
8. **Verification** - Compares file counts to ensure successful transfer

---

## 🛡️ Safety Features

✅ **COPY Mode** - Files remain on old drive (not moved)  
✅ **Duplicate Detection** - Hash-based comparison prevents re-copying  
✅ **Retry Logic** - 3 automatic retries for metadata creation  
✅ **Resume Capability** - Pick up exactly where you left off  
✅ **Space Validation** - Warns if destination lacks sufficient space  
✅ **Comprehensive Logging** - All operations logged to `.sorta_log.txt`  
✅ **No Data Loss** - Original drive untouched until you verify  

---

## 📊 How It Works

### Architecture:

```
┌─────────────────────────────────────────────┐
│  OLD DRIVE (Source)                         │
│  └─ Files remain untouched during migration │
└────────────────┬────────────────────────────┘
                 │
        ┌────────▼──────────┐
        │  SORTA v2.0       │
        │  ├─ Metadata      │
        │  ├─ Hashing       │
        │  ├─ Dedup         │
        │  └─ Resume        │
        └────────┬──────────┘
                 │
┌────────────────▼────────────────────────────┐
│  NEW DRIVE (Destination)                    │
│  └─ Organized copy of old drive             │
└─────────────────────────────────────────────┘
```

### Process Flow:

```
START
  ↓
[User selects source & destination drives]
  ↓
[Validate both drives exist and have space]
  ↓
[Create metadata: scan old drive, calculate SHA-256 hashes]
  ├─ If fails → Retry (max 3 times with 5s delay)
  ├─ If succeeds → Proceed
  └─ If all fail → Exit with error
  ↓
[Check for previous incomplete migration]
  ├─ If found → Ask to resume
  └─ If not → Start fresh
  ↓
[Copy files from old to new drive]
  ├─ Skip duplicates (hash match)
  ├─ Handle conflicts (skip/replace/rename)
  ├─ Save progress every 100 files
  └─ Show real-time progress with ETA
  ↓
[Verify file counts match]
  ├─ If match → Success!
  └─ If mismatch → Warning (check logs)
  ↓
END
```

---

## 💻 Usage Examples

### Basic Migration:

```bash
./examples/hdd-migration.sh
# Follows interactive prompts to select drives
```

### Manual Command (Alternative):

```bash
# If you prefer to run commands manually:

# 1. Create metadata with retry
ts-node src/app/pages/api/create-metadata.ts /Volumes/OldDrive /Volumes/NewDrive/.sorta_metadata.json

# 2. Run migration
ts-node src/app/pages/api/sorta.ts /Volumes/OldDrive /Volumes/NewDrive

# 3. If interrupted, resume with:
ts-node src/app/pages/api/sorta.ts --resume

# 4. Verify results
ls -lR /Volumes/NewDrive
```

---

## 📂 Pre-Migration Checklist

- [ ] **Backup Important Data** - Always have a backup before major operations
- [ ] **Verify Old Drive Accessibility** - Ensure old drive is readable
- [ ] **Check New Drive Capacity** - New drive must have at least as much space as old drive
- [ ] **Backup New Drive First** - If reusing an old drive, back up its data first
- [ ] **Disable Sleep** - Set computer to not sleep during migration
- [ ] **Connect Drives Securely** - Ensure both drives are properly connected
- [ ] **Close Other Applications** - Free up system resources
- [ ] **Note Old Drive Name** - You'll need it for the script

---

## 🔍 Understanding the Output

### Progress Bar:
```
Progress: [████████████████░░░░] 75.5% (755/1000) Copied: 720 Skipped: 35 ETA: 45s
```

- **Visual bar**: Shows completion percentage
- **Percentage**: 75.5% done
- **Files**: 755 of 1000 processed
- **Copied**: 720 files successfully copied
- **Skipped**: 35 duplicates/errors skipped
- **ETA**: ~45 seconds remaining

### Final Summary:
```
================================================================================
✓ ORGANIZATION COMPLETE
================================================================================
Total Files:     1000
Copied:          965
Skipped:         35
Errors:          0
Time Elapsed:    125.45s
Files/Second:    7.97
================================================================================
```

---

## 📁 Generated Files

During migration, these files are created:

### On New Drive:
```
/Volumes/NewDrive/
├── .sorta_metadata.json      # SHA-256 hashes of all files
├── .sorta_state.json         # Current progress (if interrupted)
├── .sorta_log.txt            # Complete operation log
└── [organized files by extension]
    ├── jpg/
    ├── mp4/
    ├── pdf/
    └── ...
```

### Log File Contents:
```
[2025-12-08T10:30:15.123Z] Starting organization...
[2025-12-08T10:30:16.456Z] Skipping identical file (hash match): photo.jpg
[2025-12-08T10:30:17.789Z] Copied file: document.pdf
[2025-12-08T10:35:42.123Z] ✓ Organization complete - 1000 files processed
```

---

## 🔄 Resume After Interruption

If migration is interrupted (power loss, disconnection, etc.):

### Option 1: Using Script
```bash
./examples/hdd-migration.sh
# Select the same drives when prompted
# Script detects previous state and asks if you want to resume
```

### Option 2: Manual Resume
```bash
cd /path/to/sorta
ts-node src/app/pages/api/sorta.ts --resume
# Continues from exact point where it stopped
```

### How Resume Works:
- `.sorta_state.json` tracks progress
- `.sorta_metadata.json` marks which files are copied
- Hash comparison prevents duplicate copies
- **Zero data loss** - only missed files are copied

---

## ⚠️ Important Notes

### Source vs Destination
- **Source** = Old Drive (read from)
- **Destination** = New Drive (write to)
- Script uses COPY mode (originals stay on old drive)

### Disk Paths on macOS
- External drives appear in `/Volumes/`
- Example: `/Volumes/OldDrive` or `/Volumes/NewDrive`
- Check with: `diskutil list`

### File Organization
- Files automatically sorted by extension
- Example: `photo.jpg` → `jpg/` folder
- Timestamps preserved
- No files are moved, renamed, or lost

### Duplicate Handling
- **Hash Match** (identical): Skipped automatically
- **Name Conflict**: You choose: Skip/Replace/Rename
- **"Apply to All"**: Remembers your choice for session

### Space Requirements
- Destination must have **at least** as much free space as source
- Example: 500GB old drive → 500GB minimum on new drive
- Recommended: 20% buffer for safety

---

## 🛠️ Troubleshooting

### "Source directory does not exist"
```bash
# Solution: Check the drive path
diskutil list
# Use the path shown, e.g., /Volumes/OldDrive
```

### "Not enough space on destination"
```bash
# Solution: Free up space on new drive or use larger drive
df -h /Volumes/NewDrive
```

### "Permission denied"
```bash
# Solution: Check drive permissions
ls -lR /Volumes/OldDrive

# If needed, repair drive:
diskutil repairVolume /Volumes/OldDrive
```

### "Migration got interrupted"
```bash
# Solution: Resume from where it left off
./examples/hdd-migration.sh
# Or manually:
ts-node src/app/pages/api/sorta.ts --resume
```

### "File count mismatch"
```bash
# This is normal if old drive contains system files
# Check the log file for details:
cat /Volumes/NewDrive/.sorta_log.txt

# Count files on both drives:
find /Volumes/OldDrive -type f | wc -l
find /Volumes/NewDrive -type f | wc -l
```

---

## 📊 Performance Expectations

### Typical Speed:
- **Small files** (< 1MB): 10-20 files/second
- **Medium files** (1-10MB): 5-10 files/second
- **Large files** (> 10MB): 1-5 files/second

### Factors Affecting Speed:
- Disk type (SSD faster than HDD)
- File sizes (smaller = faster)
- Number of duplicates (skip faster than copy)
- System load (fewer apps = faster)

### Example Timeline:
- **1,000 files**: 2-5 minutes
- **10,000 files**: 20-50 minutes
- **100,000 files**: 3-8 hours

---

## ✅ Post-Migration Checklist

- [ ] **Verify File Count** - Compare source vs destination
- [ ] **Check Log File** - Review `.sorta_log.txt` for errors
- [ ] **Spot Check Files** - Open random files to verify integrity
- [ ] **Check Disk Space** - Ensure all data was copied
- [ ] **Test New Drive** - Boot from new drive if it's a boot drive
- [ ] **Run Checksums** - Optional: verify file integrity with hashing
- [ ] **Archive Old Drive** - Store safely as backup
- [ ] **Update Documentation** - Note drive serial numbers and dates

---

## 🆘 Getting Help

### Check Logs:
```bash
# View migration log
cat /Volumes/NewDrive/.sorta_log.txt

# View last 50 lines
tail -n 50 /Volumes/NewDrive/.sorta_log.txt

# Search for errors
grep "Error" /Volumes/NewDrive/.sorta_log.txt
```

### View State:
```bash
# Check current progress
cat /Volumes/NewDrive/.sorta_state.json
```

### Get Disk Info:
```bash
# List all drives
diskutil list

# Get info about specific drive
diskutil info /Volumes/OldDrive

# Check drive usage
df -h /Volumes/*
```

---

## 🎯 Best Practices

1. **Always Backup First** - Never rely solely on migration
2. **Disable Sleep** - Set system to never sleep during migration
3. **Monitor Progress** - Watch first batch of files to ensure correctness
4. **Don't Interrupt** - Let migration complete if possible
5. **Verify After** - Always verify results before removing old drive
6. **Keep Logs** - Save migration logs for records
7. **Test Important Files** - Open critical files to confirm integrity
8. **Use Wired Connection** - If drives are network-attached
9. **Check Temperature** - Monitor drive temperature during migration
10. **Plan for Time** - Large migrations take hours, plan accordingly

---

## 📝 Version History

### v2.0 (Current)
- ✅ Interactive drive selection
- ✅ Automatic validation
- ✅ Retry logic (3x with 5s delay)
- ✅ Resume capability
- ✅ Progress tracking
- ✅ Verification

### v1.0 (Previous)
- Basic copy functionality
- Manual metadata creation
- Simple error handling

---

## 📧 Support & Contributions

For issues, suggestions, or improvements:
- GitHub: https://github.com/ilovespectra/sorta
- Issues: https://github.com/ilovespectra/sorta/issues

---

## 📄 License

This script uses Sorta v2.0 - See LICENSE in main repository

---

**Happy Migrating! 🚀**
