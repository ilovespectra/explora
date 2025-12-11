#!/bin/bash
# Inspect File Metadata
# Use this to debug or check file timestamps before organizing

FILE_PATH="/path/to/file.jpg"

echo "🔍 Inspecting file metadata..."
echo "File: $FILE_PATH"
echo ""

ts-node src/app/pages/api/inspect.ts

# Note: Edit inspect.ts to change the file paths you want to check
# The script has a hardcoded array: filesToCheck = ['/your/desired/path']
