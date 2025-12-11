#!/bin/bash
# Organize Photos Only
# For organizing a photo library or camera roll

SOURCE_DIR="/Volumes/SD_Card/DCIM"
DEST_DIR="$HOME/Pictures/Organized"

echo "📸 Organizing Photos from SD Card..."

# Create metadata
echo "Creating metadata database..."
ts-node src/app/pages/api/create-metadata.ts "$SOURCE_DIR"

# Sort images by date
echo "Sorting images by date and type..."
ts-node src/app/pages/api/sorta-pics.ts "$SOURCE_DIR" "$DEST_DIR"

echo "✅ Photos organized!"
echo "Images saved to: $DEST_DIR/images/"
