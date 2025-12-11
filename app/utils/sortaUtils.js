/**
 * SORTA FILE ORGANIZER - Browser Utilities
 * 
 * These utilities are browser-compatible versions of the original Node.js
 * file organization scripts, adapted to work with the File System Access API.
 */

// File type categorizations
export const FILE_CATEGORIES = {
  images: {
    name: 'Images',
    extensions: new Set([
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', 
      '.heic', '.heif', '.raw', '.cr2', '.nef', '.tiff', '.tif',
      '.ico', '.psd', '.xcf', '.orf', '.arw', '.sr2', '.dng'
    ]),
    color: '#00ff00'
  },
  videos: {
    name: 'Videos',
    extensions: new Set([
      '.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', 
      '.wmv', '.m4v', '.mpg', '.mpeg', '.ogv', '.3gp'
    ]),
    color: '#00aaff'
  },
  audio: {
    name: 'Audio',
    extensions: new Set([
      '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', 
      '.wma', '.opus', '.aiff', '.alac'
    ]),
    color: '#ffaa00'
  },
  documents: {
    name: 'Documents',
    extensions: new Set([
      '.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', 
      '.xls', '.xlsx', '.ppt', '.pptx', '.pages', '.numbers'
    ]),
    color: '#aa00ff'
  },
  archives: {
    name: 'Archives',
    extensions: new Set([
      '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'
    ]),
    color: '#ff6600'
  },
  code: {
    name: 'Code',
    extensions: new Set([
      '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json',
      '.py', '.java', '.cpp', '.c', '.h', '.go', '.rs', '.php'
    ]),
    color: '#00ff88'
  }
};

/**
 * Calculate SHA-256 hash of a file
 * @param {File} file - The file to hash
 * @returns {Promise<string|null>} - The hash string or null on error
 */
export async function calculateFileHash(file) {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error(`Error calculating hash for ${file.name}:`, error);
    return null;
  }
}

/**
 * Format a date as YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
export function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get the file category based on extension
 * @param {string} fileName - The name of the file
 * @param {Object} enabledCategories - Which categories are enabled
 * @returns {string|null} - The category name or null if not categorized
 */
export function getFileCategory(fileName, enabledCategories = {}) {
  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
  
  for (const [category, info] of Object.entries(FILE_CATEGORIES)) {
    if (enabledCategories[category] && info.extensions.has(ext)) {
      return category;
    }
  }
  
  return enabledCategories.others ? 'others' : null;
}

/**
 * Recursively collect files from a directory
 * @param {FileSystemDirectoryHandle} directoryHandle - The directory to scan
 * @param {Object} enabledCategories - Which categories to include
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Array>} - Array of file entries
 */
export async function collectFiles(directoryHandle, enabledCategories, onProgress = null) {
  const files = [];
  
  async function traverse(handle, path = '') {
    try {
      for await (const entry of handle.values()) {
        // Skip hidden files/folders
        if (entry.name.startsWith('.')) continue;
        
        if (entry.kind === 'directory') {
          await traverse(entry, `${path}${entry.name}/`);
        } else if (entry.kind === 'file') {
          const category = getFileCategory(entry.name, enabledCategories);
          if (category) {
            files.push({
              handle: entry,
              path: `${path}${entry.name}`,
              name: entry.name,
              category
            });
            if (onProgress) onProgress(files.length);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${path}:`, error);
    }
  }
  
  await traverse(directoryHandle);
  return files;
}

/**
 * Create a destination directory path
 * @param {FileSystemDirectoryHandle} rootHandle - The root destination directory
 * @param {string} category - The category name
 * @param {string} subFolder - Optional subfolder (e.g., file extension)
 * @returns {Promise<FileSystemDirectoryHandle>} - The created directory handle
 */
export async function createDestinationPath(rootHandle, category, subFolder = null) {
  try {
    let categoryHandle = await rootHandle.getDirectoryHandle(category, { create: true });
    
    if (subFolder) {
      categoryHandle = await categoryHandle.getDirectoryHandle(subFolder, { create: true });
    }
    
    return categoryHandle;
  } catch (error) {
    console.error(`Error creating destination path ${category}/${subFolder}:`, error);
    return null;
  }
}

/**
 * Copy a file to the destination with optional timestamp prefix
 * @param {Object} fileEntry - The file entry with handle
 * @param {FileSystemDirectoryHandle} destHandle - Destination directory handle
 * @param {Object} options - Options for copying
 * @returns {Promise<Object>} - Result object with success/error info
 */
export async function copyFileToDestination(fileEntry, destHandle, options = {}) {
  const {
    useTimestamps = true,
    skipDuplicates = true,
    processedHashes = new Set()
  } = options;

  try {
    const fileObj = await fileEntry.handle.getFile();
    
    // Check for duplicate if enabled
    if (skipDuplicates) {
      const hash = await calculateFileHash(fileObj);
      if (hash && processedHashes.has(hash)) {
        return {
          skipped: true,
          duplicate: true,
          size: fileObj.size
        };
      }
      if (hash) processedHashes.add(hash);
    }

    // Generate destination filename
    let destFileName = fileObj.name;
    if (useTimestamps) {
      const timestamp = formatTimestamp(new Date(fileObj.lastModified));
      const ext = fileObj.name.match(/\.[^.]+$/)?.[0] || '';
      const baseName = fileObj.name.replace(ext, '');
      destFileName = `${timestamp}_${baseName}${ext}`;
    }

    // Check if file exists and add suffix if needed
    try {
      await destHandle.getFileHandle(destFileName);
      // File exists, add suffix
      const ext = fileObj.name.match(/\.[^.]+$/)?.[0] || '';
      const baseName = destFileName.replace(ext, '');
      let counter = 1;
      while (true) {
        try {
          destFileName = `${baseName}_${counter}${ext}`;
          await destHandle.getFileHandle(destFileName);
          counter++;
        } catch {
          break;
        }
      }
    } catch {
      // File doesn't exist, good to proceed
    }

    // Create new file in destination
    const newFileHandle = await destHandle.getFileHandle(destFileName, { create: true });
    const writable = await newFileHandle.createWritable();
    await writable.write(fileObj);
    await writable.close();

    return {
      success: true,
      fileName: destFileName,
      size: fileObj.size
    };

  } catch (error) {
    return {
      error: true,
      message: error.message
    };
  }
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted string
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format elapsed time
 * @param {number} seconds - Elapsed seconds
 * @returns {string} - Formatted time string
 */
export function formatElapsedTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}
