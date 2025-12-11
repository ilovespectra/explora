#!/bin/bash
# External Drive Complete Backup
# Organizes an entire external drive with all file types

SOURCE_DIR="/Volumes/MyBackupDrive"
DEST_DIR="/Volumes/Organized_Backup"

echo "💾 Starting External Drive Organization..."
echo "This may take a while for large drives..."

# Create metadata (this will scan entire drive)
echo "📊 Scanning drive and creating metadata (this may take several minutes)..."
ts-node src/app/pages/api/create-metadata.ts "$SOURCE_DIR"

# Organize all media types
echo "🖼️  Processing images..."
ts-node src/app/pages/api/sorta-pics.ts "$SOURCE_DIR" "$DEST_DIR"

echo "🎬 Processing videos..."
ts-node src/app/pages/api/sorta-vids.ts "$SOURCE_DIR" "$DEST_DIR"

echo "🎵 Processing audio..."
ts-node src/app/pages/api/sorta-audio.ts "$SOURCE_DIR" "$DEST_DIR"

echo "📄 Processing documents and other files..."
ts-node src/app/pages/api/sorta-else.ts "$SOURCE_DIR" "$DEST_DIR"

echo "✅ External drive organized!"
echo "Check duplicate report for space saved"
