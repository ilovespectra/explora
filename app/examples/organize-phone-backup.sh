#!/bin/bash
# Organize Phone Backup (Images, Videos, Audio)
# This script organizes a complete phone backup with all media types

SOURCE_DIR="/path/to/phone/backup"
DEST_DIR="/path/to/organized/media"

echo "🎯 Starting Phone Backup Organization..."
echo "Source: $SOURCE_DIR"
echo "Destination: $DEST_DIR"

# Step 1: Create metadata file (REQUIRED FIRST STEP)
echo "📊 Step 1: Creating metadata file..."
ts-node src/app/pages/api/create-metadata.ts "$SOURCE_DIR" file_metadata.json

if [ $? -ne 0 ]; then
    echo "❌ Metadata creation failed!"
    exit 1
fi

# Step 2: Organize images
echo "🖼️  Step 2: Organizing images..."
ts-node src/app/pages/api/sorta-pics.ts "$SOURCE_DIR" "$DEST_DIR"

# Step 3: Organize videos
echo "🎬 Step 3: Organizing videos..."
ts-node src/app/pages/api/sorta-vids.ts "$SOURCE_DIR" "$DEST_DIR"

# Step 4: Organize audio files
echo "🎵 Step 4: Organizing audio files..."
ts-node src/app/pages/api/sorta-audio.ts "$SOURCE_DIR" "$DEST_DIR"

echo "✅ Phone backup organization complete!"
echo "Check results at: $DEST_DIR"
