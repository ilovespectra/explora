#!/bin/bash
# Video Archive Organizer
# Specifically for organizing video collections

SOURCE_DIR="/path/to/video/collection"
DEST_DIR="/path/to/video/archive"

echo "🎬 Organizing Video Archive..."

# Create metadata
ts-node src/app/pages/api/create-metadata.ts "$SOURCE_DIR"

# Sort videos with duplicate detection
ts-node src/app/pages/api/sorta-vids.ts "$SOURCE_DIR" "$DEST_DIR"

echo "✅ Videos organized by type and date!"
echo "Location: $DEST_DIR/videos/"
