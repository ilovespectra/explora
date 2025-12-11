#!/bin/bash

################################################################################
#              HARD DRIVE MIGRATION - QUICK REFERENCE CARD                    #
#                       Keep this for reference!                              #
################################################################################

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║                 HARD DRIVE MIGRATION - QUICK REFERENCE                    ║
║                         Using Sorta v2.0                                  ║
╚════════════════════════════════════════════════════════════════════════════╝

WHAT IT DOES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Copies files from old drive to new drive (originals remain)
✓ Automatically creates SHA-256 hashes for duplicate detection
✓ Retries metadata creation 3 times if it fails
✓ Can resume if interrupted (drive disconnection, power loss, etc.)
✓ Verifies file counts match
✓ Shows real-time progress with ETA
✓ Logs everything to .sorta_log.txt

QUICK START:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Connect both old and new drives
2. Run: ./examples/hdd-migration.sh
3. Follow the interactive prompts
4. Verify results after completion

STEP-BY-STEP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1: Drive Selection
   • Script lists all available drives
   • You select source drive (old drive)
   • You select destination drive (new drive)
   • Both drives are validated

STEP 2: Metadata Creation
   • Scans old drive (counts files)
   • Calculates SHA-256 hash for each file
   • Retries 3 times if it fails (5 second delay between retries)
   • Saves to .sorta_metadata.json

STEP 3: Migration
   • Copies files from old to new drive
   • Skips duplicate files (by hash match)
   • Shows progress bar with ETA
   • Saves state every 100 files

STEP 4: Resume (if needed)
   • If interrupted, re-run the script
   • Script detects previous state
   • Asks if you want to resume
   • Continues from exact stopping point

STEP 5: Verification
   • Counts files on both drives
   • Compares totals
   • Reports any discrepancies

IMPORTANT WARNINGS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  BACKUP YOUR DATA FIRST - Always have backups
⚠️  VERIFY OLD DRIVE - Ensure it's readable before starting
⚠️  CHECK SPACE - New drive must have ≥ space of old drive
⚠️  DON'T INTERRUPT - Let migration finish if possible
⚠️  MONITOR CLOSELY - Watch first batch of files
⚠️  VERIFY AFTER - Don't remove old drive until you verify new drive works

DRIVE PATHS (macOS):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
External drives appear in /Volumes/

Examples:
   /Volumes/OldDrive      (old hard drive)
   /Volumes/NewDrive      (new hard drive)
   /Volumes/Backup        (external USB drive)

List drives:
   diskutil list

Get info about a drive:
   diskutil info /Volumes/OldDrive

Check free space:
   df -h /Volumes/NewDrive

RESUME AFTER INTERRUPTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option 1: Using the script (recommended)
   ./examples/hdd-migration.sh
   [Select same drives as before]
   [Choose to resume when prompted]

Option 2: Manual resume
   ts-node src/app/pages/api/sorta.ts --resume

The migration will continue from exactly where it stopped!
No files will be duplicated or lost.

HOW IT HANDLES DUPLICATES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Identical Files (Hash Match):
   • Automatically skipped
   • No prompt needed
   • Saves time and space

Different Files, Same Name:
   • Prompts you: Skip / Replace / Rename
   • "Apply to All" remembers your choice
   • Choose what makes sense for your situation

PROGRESS BAR EXPLAINED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: [████████████████░░░░] 75.5% (755/1000) Copied: 720 Skipped: 35 ETA: 45s

  ████████████████░░░░ = Visual progress (75.5%)
  75.5%              = Percentage complete
  755/1000           = Files processed out of total
  Copied: 720        = Files successfully copied
  Skipped: 35        = Duplicates/errors skipped
  ETA: 45s           = Estimated time remaining

GENERATED FILES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On new drive after migration:

.sorta_metadata.json       = SHA-256 hashes of all files
.sorta_state.json          = Progress state (if interrupted)
.sorta_log.txt             = Complete operation log
[organized folders]        = Files organized by extension
  ├── jpg/
  ├── mp4/
  ├── pdf/
  ├── docx/
  └── ...

TYPICAL PERFORMANCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Speed varies based on file sizes and disk types:

Files ≤ 1MB:        10-20 files/second
Files 1-10MB:        5-10 files/second
Files > 10MB:        1-5 files/second

Examples:
   1,000 files     = 2-5 minutes
   10,000 files    = 20-50 minutes
   100,000 files   = 3-8 hours

Factors affecting speed:
   • SSD vs HDD (SSD faster)
   • File sizes (smaller = faster)
   • Number of duplicates
   • System load
   • Drive connection type (USB, Thunderbolt, etc.)

TROUBLESHOOTING:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Source directory does not exist"
   → Check drive path: diskutil list
   → Verify drive is mounted in /Volumes/

"Not enough space on destination"
   → Check: df -h /Volumes/NewDrive
   → Free up space or use larger drive

"Permission denied"
   → Check permissions: ls -lR /Volumes/OldDrive
   → Repair drive: diskutil repairVolume /Volumes/OldDrive

"Migration interrupted"
   → Resume with: ./examples/hdd-migration.sh
   → Or: ts-node src/app/pages/api/sorta.ts --resume

"File count mismatch"
   → Check log: cat /Volumes/NewDrive/.sorta_log.txt
   → Normal if old drive has system files
   → Verify important files manually

POST-MIGRATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before removing old drive:

☐ Verify file counts match
☐ Open random files to test
☐ Boot from new drive (if it's a boot drive)
☐ Review .sorta_log.txt for errors
☐ Check disk usage matches
☐ Test all critical applications
☐ Keep old drive as backup
☐ Update your records with drive info

RETENTION POLICY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After successful migration:

Keep old drive for:  1-2 weeks minimum (verify everything works)
                     1-3 months recommended (safety buffer)
                     6 months suggested (extended backup)

Then either:
   • Securely wipe and repurpose
   • Store as permanent backup
   • Recycle properly

ADVANCED OPTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Manual metadata creation:
   ts-node src/app/pages/api/create-metadata.ts /Volumes/OldDrive /path/to/metadata.json

Manual migration start:
   ts-node src/app/pages/api/sorta.ts /Volumes/OldDrive /Volumes/NewDrive

Manual resume:
   ts-node src/app/pages/api/sorta.ts --resume

Check metadata:
   cat /Volumes/NewDrive/.sorta_metadata.json

View logs:
   tail -f /Volumes/NewDrive/.sorta_log.txt

GETTING HELP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Full guide:
   cat examples/HDD-MIGRATION-GUIDE.md

GitHub issues:
   https://github.com/ilovespectra/sorta/issues

Check logs:
   cat /Volumes/NewDrive/.sorta_log.txt

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HAPPY MIGRATING! 🚀

Remember: The original drive is never modified. It's always safe to stop
and resume. Your data is protected throughout the process.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF
