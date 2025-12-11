#!/bin/bash
# Organize Messy Downloads Folder
# Sorts all file types into organized categories

SOURCE_DIR="$HOME/Downloads"
DEST_DIR="$HOME/Downloads/Organized"

echo "🗂️  Cleaning up Downloads folder..."

# Create metadata
echo "Step 1: Analyzing files..."
ts-node src/app/pages/api/create-metadata.ts "$SOURCE_DIR"

# Organize images
echo "Step 2: Organizing images..."
ts-node src/app/pages/api/sorta-pics.ts "$SOURCE_DIR" "$DEST_DIR"

# Organize videos
echo "Step 3: Organizing videos..."
ts-node src/app/pages/api/sorta-vids.ts "$SOURCE_DIR" "$DEST_DIR"

# Organize audio
echo "Step 4: Organizing audio..."
ts-node src/app/pages/api/sorta-audio.ts "$SOURCE_DIR" "$DEST_DIR"

# Organize documents and other files
echo "Step 5: Organizing documents and archives..."
ts-node src/app/pages/api/sorta-else.ts "$SOURCE_DIR" "$DEST_DIR"

# Organize screenshots specifically
echo "Step 6: Collecting screenshots..."
ts-node src/app/pages/api/sorta-by-name.ts "$SOURCE_DIR"

echo "✅ Downloads folder organized!"
echo "Files categorized in: $DEST_DIR"
