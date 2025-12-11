#!/bin/bash
# Quick Copy by Extension (No metadata, interactive duplicates)
# Uses sorta.ts for simple extension-based organization

SOURCE_DIR="/path/to/source"
DEST_DIR="/path/to/destination"

echo "📁 Quick organize by file extension..."
echo "Note: This will COPY files (originals remain) and prompt for duplicates"
echo ""

# No metadata needed - sorta.ts works standalone
ts-node src/app/pages/api/sorta.ts "$SOURCE_DIR" "$DEST_DIR"

echo "✅ Files copied and organized by extension!"
