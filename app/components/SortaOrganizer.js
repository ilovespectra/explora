import { useState, useRef } from 'react';
import styles from './SortaOrganizer.module.css';

const SortaOrganizer = ({ onClose }) => {
  const [sourceDirectory, setSourceDirectory] = useState(null);
  const [destinationDirectory, setDestinationDirectory] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState('');
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState({
    processed: 0,
    skipped: 0,
    duplicates: 0,
    spaceSaved: 0,
    errors: 0,
    metadataApplied: 0
  });
  
  // Organize mode
  const [organizeMode, setOrganizeMode] = useState('flat'); // 'flat' or 'preserve'
  
  // Organize options
  const [options, setOptions] = useState({
    organizeImages: true,
    organizeVideos: true,
    organizeAudio: true,
    organizeDocuments: true,
    organizeOthers: false,
    skipDuplicates: true,
    useTimestamps: false,
    createSubfolders: true,
    moveFiles: false, // false = copy, true = move (delete originals)
    applyMetadata: false,
    metadataAction: 'rename' // 'rename' or 'duplicate'
  });

  const sourceHandleRef = useRef(null);
  const destHandleRef = useRef(null);
  const metadataRef = useRef(new Map()); // Store file hashes
  const processedHashesRef = useRef(new Set());

  // File type categorization
  const fileTypes = {
    images: new Set(['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.heic', '.heif', '.raw', '.cr2', '.nef', '.tiff', '.tif']),
    videos: new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v', '.mpg', '.mpeg']),
    audio: new Set(['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.opus', '.aiff']),
    documents: new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx'])
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, { timestamp, message, type }]);
  };

  const selectSourceDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      sourceHandleRef.current = handle;
      setSourceDirectory(handle.name);
      addLog(`Source directory selected: ${handle.name}`, 'success');
    } catch (error) {
      if (error.name !== 'AbortError') {
        addLog(`Error selecting source: ${error.message}`, 'error');
      }
    }
  };

  const selectDestinationDirectory = async () => {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      destHandleRef.current = handle;
      setDestinationDirectory(handle.name);
      addLog(`Destination directory selected: ${handle.name}`, 'success');
      
      // Check if destination is same as source
      if (sourceHandleRef.current && handle.name === sourceHandleRef.current.name) {
        addLog('⚠️ Source and destination are the same - files will be organized in-place', 'warn');
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        addLog(`Error selecting destination: ${error.message}`, 'error');
      }
    }
  };

  const getFileCategory = (fileName) => {
    const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    
    if (options.organizeImages && fileTypes.images.has(ext)) return 'Images';
    if (options.organizeVideos && fileTypes.videos.has(ext)) return 'Videos';
    if (options.organizeAudio && fileTypes.audio.has(ext)) return 'Audio';
    if (options.organizeDocuments && fileTypes.documents.has(ext)) return 'Documents';
    if (options.organizeOthers) return 'Other';
    
    return null;
  };

  const calculateFileHash = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      addLog(`Error calculating hash for ${file.name}: ${error.message}`, 'error');
      return null;
    }
  };

  const formatTimestamp = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const collectFiles = async (directoryHandle, files = [], relativePath = '') => {
    try {
      for await (const entry of directoryHandle.values()) {
        if (entry.name.startsWith('.')) continue; // Skip hidden files
        
        const currentPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.kind === 'directory') {
          if (organizeMode === 'preserve') {
            // Keep directory structure
            files.push({ 
              handle: entry, 
              path: currentPath, 
              isDirectory: true,
              relativePath: currentPath 
            });
          }
          await collectFiles(entry, files, currentPath);
        } else if (entry.kind === 'file') {
          const category = getFileCategory(entry.name);
          if (category) {
            files.push({ 
              handle: entry, 
              path: currentPath, 
              category,
              isDirectory: false,
              fileName: entry.name,
              parentPath: relativePath
            });
          }
        }
      }
    } catch (error) {
      addLog(`✗ Error reading directory: ${error.message}`, 'error');
    }
    return files;
  };

  const createDestinationPath = async (category, subFolder = null) => {
    try {
      let categoryHandle = await destHandleRef.current.getDirectoryHandle(category, { create: true });
      
      if (subFolder && options.createSubfolders) {
        categoryHandle = await categoryHandle.getDirectoryHandle(subFolder, { create: true });
      }
      
      return categoryHandle;
    } catch (error) {
      addLog(`✗ Error creating destination path: ${error.message}`, 'error');
      return null;
    }
  };

  const createPreservedPath = async (relativePath) => {
    try {
      const pathParts = relativePath.split('/');
      let currentHandle = destHandleRef.current;
      
      for (const part of pathParts) {
        currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
      }
      
      return currentHandle;
    } catch (error) {
      addLog(`✗ Error creating preserved path: ${error.message}`, 'error');
      return null;
    }
  };

  const applyFileMetadata = async (fileObj, destFileName) => {
    // Extract metadata from filename and apply formatting
    // This could be extended to read from exif/metadata libraries
    const timestamp = formatTimestamp(new Date(fileObj.lastModified));
    const ext = fileObj.name.match(/\.[^.]+$/)?.[0] || '';
    const baseName = fileObj.name.replace(ext, '');
    
    // Format: [timestamp] filename.ext
    return `[${timestamp}] ${baseName}${ext}`;
  };

  const moveFile = async (sourceHandle, file, category) => {
    try {
      const fileObj = await file.handle.getFile();
      
      // Calculate hash if duplicate checking is enabled
      let hash = null;
      if (options.skipDuplicates) {
        hash = await calculateFileHash(fileObj);
        if (hash && processedHashesRef.current.has(hash)) {
          setStats(prev => ({
            ...prev,
            duplicates: prev.duplicates + 1,
            spaceSaved: prev.spaceSaved + fileObj.size
          }));
          addLog(`⏭ Skipped duplicate: ${file.path}`, 'warn');
          return { skipped: true };
        }
      }

      // Create destination filename
      let destFileName = fileObj.name;
      
      // Apply metadata if enabled
      if (options.applyMetadata) {
        destFileName = await applyFileMetadata(fileObj, destFileName);
      } else if (options.useTimestamps) {
        const timestamp = formatTimestamp(new Date(fileObj.lastModified));
        const ext = fileObj.name.match(/\.[^.]+$/)?.[0] || '';
        const baseName = fileObj.name.replace(ext, '');
        destFileName = `${timestamp}_${baseName}${ext}`;
      }

      let destHandle;

      if (organizeMode === 'preserve') {
        // Preserve directory structure
        destHandle = await createPreservedPath(file.parentPath);
        if (!destHandle) return { error: true };
      } else {
        // Flat organization by file type
        const ext = fileObj.name.match(/\.[^.]+$/)?.[0].replace('.', '') || 'misc';
        destHandle = await createDestinationPath(category, ext);
        if (!destHandle) return { error: true };
      }

      // Check if file already exists
      try {
        await destHandle.getFileHandle(destFileName);
        // File exists, add suffix
        const ext = fileObj.name.match(/\.[^.]+$/)?.[0] || '';
        const baseName = destFileName.replace(ext, '');
        destFileName = `${baseName}_copy${ext}`;
      } catch {
        // File doesn't exist, good to proceed
      }

      // Create new file in destination
      const newFileHandle = await destHandle.getFileHandle(destFileName, { create: true });
      const writable = await newFileHandle.createWritable();
      await writable.write(fileObj);
      await writable.close();

      // If move mode is enabled, delete the original file
      if (options.moveFiles) {
        try {
          await sourceHandle.removeEntry(file.handle.name);
          addLog(`✓ Moved: ${file.path} → ${destFileName}`, 'success');
        } catch (deleteError) {
          addLog(`⚠ File copied but delete failed: ${file.path}`, 'warn');
        }
      } else {
        addLog(`✓ Copied: ${file.path} → ${destFileName}`, 'success');
      }

      // Track the hash
      if (hash) {
        processedHashesRef.current.add(hash);
      }

      if (options.applyMetadata) {
        setStats(prev => ({ ...prev, metadataApplied: prev.metadataApplied + 1 }));
      }

      return { success: true };

    } catch (error) {
      addLog(`✗ Error ${options.moveFiles ? 'moving' : 'copying'} ${file.path}: ${error.message}`, 'error');
      return { error: true };
    }
  };

  const startOrganizing = async () => {
    if (!sourceHandleRef.current || !destHandleRef.current) {
      addLog('✗ Please select both source and destination directories', 'error');
      return;
    }

    setIsProcessing(true);
    setStatus('Scanning files...');
    setLog([]);
    setStats({ processed: 0, skipped: 0, duplicates: 0, spaceSaved: 0, errors: 0, metadataApplied: 0 });
    processedHashesRef.current.clear();

    try {
      // Collect all files
      addLog(`📂 Scanning source directory (${organizeMode} mode)...`, 'info');
      const files = await collectFiles(sourceHandleRef.current);
      
      const fileCount = files.filter(f => !f.isDirectory).length;
      if (fileCount === 0) {
        addLog('⚠ No files found matching the selected categories', 'warn');
        setIsProcessing(false);
        return;
      }

      setProgress({ current: 0, total: fileCount });
      addLog(`✓ Found ${fileCount} files to organize`, 'success');
      setStatus('Organizing files...');

      // Process files
      let processedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.isDirectory) continue;
        
        processedCount++;
        setProgress({ current: processedCount, total: fileCount });
        setStatus(`Processing ${file.fileName}...`);

        const result = await moveFile(sourceHandleRef.current, file, file.category);
        
        if (result.success) {
          setStats(prev => ({ ...prev, processed: prev.processed + 1 }));
        } else if (result.skipped) {
          setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
        } else if (result.error) {
          setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
        }
      }

      setStatus('✓ Organization complete!');
      addLog(`\n════════════════════════════════════════`, 'success');
      addLog(`✓ COMPLETE - Organized ${stats.processed} files`, 'success');
      addLog(`✓ Skipped ${stats.skipped} files`, 'info');
      addLog(`✓ Found ${stats.duplicates} duplicates (saved ${(stats.spaceSaved / (1024 * 1024)).toFixed(2)} MB)`, 'info');
      if (options.applyMetadata) {
        addLog(`✓ Applied metadata to ${stats.metadataApplied} files`, 'success');
      }
      if (stats.errors > 0) {
        addLog(`⚠ ${stats.errors} errors occurred`, 'warn');
      }
      addLog(`════════════════════════════════════════`, 'success');

    } catch (error) {
      addLog(`✗ Fatal error: ${error.message}`, 'error');
      setStatus('✗ Organization failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleOption = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.sortaContainer}>
      <div className={styles.header}>
        <h2>$ SORTA - FILE ORGANIZER v2</h2>
        <button onClick={onClose} className={styles.closeBtn}>×</button>
      </div>

      <div className={styles.content}>
        {/* Explanation */}
        <div className={styles.infoBox}>
          <div className={styles.infoTitle}>📋 WHAT SORTA DOES:</div>
          <ul className={styles.infoList}>
            <li>✓ Scans your source directory for files</li>
            <li>✓ Categorizes files by type (images, videos, audio, documents)</li>
            <li>✓ Organizes them into labeled folders</li>
            <li>✓ Optionally preserves existing directory structure</li>
            <li>✓ Detects duplicates using SHA-256 hashing</li>
            <li>✓ Applies metadata formatting to filenames</li>
            <li>✓ Can copy OR move (delete originals) - YOUR choice!</li>
          </ul>
        </div>

        {/* Directory Selection */}
        <div className={styles.section}>
          <h3>// STEP 1: SELECT DIRECTORIES</h3>
          <div className={styles.directoryRow}>
            <button 
              onClick={selectSourceDirectory}
              className={styles.selectBtn}
              disabled={isProcessing}
            >
              [SELECT SOURCE]
            </button>
            <span className={styles.dirName}>
              {sourceDirectory ? `✓ ${sourceDirectory}` : '○ No source selected'}
            </span>
          </div>
          <div className={styles.directoryRow}>
            <button 
              onClick={selectDestinationDirectory}
              className={styles.selectBtn}
              disabled={isProcessing}
            >
              [SELECT DESTINATION]
            </button>
            <span className={styles.dirName}>
              {destinationDirectory ? `✓ ${destinationDirectory}` : '○ No destination selected'}
            </span>
          </div>
          <div className={styles.hint}>
            💡 TIP: Source and destination can be the same folder for in-place organization
          </div>
        </div>

        {/* Organization Mode */}
        <div className={styles.section}>
          <h3>// STEP 2: CHOOSE ORGANIZATION MODE</h3>
          <div className={styles.modeGrid}>
            <label className={`${styles.modeCard} ${organizeMode === 'flat' ? styles.selectedMode : ''}`}>
              <input
                type="radio"
                name="organizeMode"
                value="flat"
                checked={organizeMode === 'flat'}
                onChange={() => setOrganizeMode('flat')}
                disabled={isProcessing}
              />
              <div className={styles.modeCardContent}>
                <span className={styles.modeCardTitle}>📂 FLAT ORGANIZATION</span>
                <span className={styles.modeCardDesc}>Creates category folders (Images, Videos, etc.) with optional file-type subfolders</span>
                <span className={styles.modeCardExample}>Result: /Images/jpg/, /Videos/mp4/, etc.</span>
              </div>
            </label>

            <label className={`${styles.modeCard} ${organizeMode === 'preserve' ? styles.selectedMode : ''}`}>
              <input
                type="radio"
                name="organizeMode"
                value="preserve"
                checked={organizeMode === 'preserve'}
                onChange={() => setOrganizeMode('preserve')}
                disabled={isProcessing}
              />
              <div className={styles.modeCardContent}>
                <span className={styles.modeCardTitle}>📁 PRESERVE STRUCTURE</span>
                <span className={styles.modeCardDesc}>Keeps existing directory structure intact, just copies/moves files</span>
                <span className={styles.modeCardExample}>Result: Original folder hierarchy maintained</span>
              </div>
            </label>
          </div>
        </div>

        {/* File Categories */}
        <div className={styles.section}>
          <h3>// STEP 3: SELECT FILE CATEGORIES</h3>
          <div className={styles.optionsGrid}>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={options.organizeImages}
                onChange={() => toggleOption('organizeImages')}
                disabled={isProcessing}
              />
              <span className={styles.checkboxLabel}>[{options.organizeImages ? '✓' : ' '}] Images</span>
            </label>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={options.organizeVideos}
                onChange={() => toggleOption('organizeVideos')}
                disabled={isProcessing}
              />
              <span className={styles.checkboxLabel}>[{options.organizeVideos ? '✓' : ' '}] Videos</span>
            </label>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={options.organizeAudio}
                onChange={() => toggleOption('organizeAudio')}
                disabled={isProcessing}
              />
              <span className={styles.checkboxLabel}>[{options.organizeAudio ? '✓' : ' '}] Audio</span>
            </label>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={options.organizeDocuments}
                onChange={() => toggleOption('organizeDocuments')}
                disabled={isProcessing}
              />
              <span className={styles.checkboxLabel}>[{options.organizeDocuments ? '✓' : ' '}] Documents</span>
            </label>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={options.organizeOthers}
                onChange={() => toggleOption('organizeOthers')}
                disabled={isProcessing}
              />
              <span className={styles.checkboxLabel}>[{options.organizeOthers ? '✓' : ' '}] Other Files</span>
            </label>
          </div>
        </div>

        {/* Processing Options */}
        <div className={styles.section}>
          <h3>// STEP 4: CONFIGURE OPTIONS</h3>
          
          <div className={styles.optionGroup}>
            <div className={styles.optionGroupTitle}>🛡 Safety Options</div>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={options.skipDuplicates}
                onChange={() => toggleOption('skipDuplicates')}
                disabled={isProcessing}
              />
              <span className={styles.checkboxLabel}>[{options.skipDuplicates ? '✓' : ' '}] Skip Duplicates (SHA-256)</span>
            </label>
          </div>

          <div className={styles.optionGroup}>
            <div className={styles.optionGroupTitle}>📝 Formatting Options</div>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={options.useTimestamps}
                onChange={() => toggleOption('useTimestamps')}
                disabled={isProcessing || options.applyMetadata}
              />
              <span className={styles.checkboxLabel}>[{options.useTimestamps ? '✓' : ' '}] Add Timestamps</span>
            </label>
            <label className={styles.option}>
              <input
                type="checkbox"
                checked={options.applyMetadata}
                onChange={() => toggleOption('applyMetadata')}
                disabled={isProcessing}
              />
              <span className={styles.checkboxLabel}>[{options.applyMetadata ? '✓' : ' '}] Apply Metadata Formatting</span>
            </label>
            {options.applyMetadata && (
              <div className={styles.subOptionGroup}>
                <label className={styles.subOption}>
                  <input
                    type="radio"
                    name="metadataAction"
                    value="rename"
                    checked={options.metadataAction === 'rename'}
                    onChange={() => setOptions(prev => ({ ...prev, metadataAction: 'rename' }))}
                    disabled={isProcessing}
                  />
                  <span>Rename files with metadata</span>
                </label>
                <label className={styles.subOption}>
                  <input
                    type="radio"
                    name="metadataAction"
                    value="duplicate"
                    checked={options.metadataAction === 'duplicate'}
                    onChange={() => setOptions(prev => ({ ...prev, metadataAction: 'duplicate' }))}
                    disabled={isProcessing}
                  />
                  <span>Create duplicates with metadata</span>
                </label>
              </div>
            )}
          </div>

          {organizeMode === 'flat' && (
            <div className={styles.optionGroup}>
              <div className={styles.optionGroupTitle}>📋 Structure Options</div>
              <label className={styles.option}>
                <input
                  type="checkbox"
                  checked={options.createSubfolders}
                  onChange={() => toggleOption('createSubfolders')}
                  disabled={isProcessing}
                />
                <span className={styles.checkboxLabel}>[{options.createSubfolders ? '✓' : ' '}] Create File-Type Subfolders</span>
              </label>
            </div>
          )}
        </div>

        {/* Copy vs Move */}
        <div className={styles.section}>
          <h3>// STEP 5: FILE OPERATION MODE ⚠️ DESTRUCTIVE ACTION</h3>
          <div className={styles.modeSelector}>
            <label className={`${styles.modeOption} ${!options.moveFiles ? styles.selected : ''}`}>
              <input
                type="radio"
                name="operationMode"
                checked={!options.moveFiles}
                onChange={() => setOptions(prev => ({ ...prev, moveFiles: false }))}
                disabled={isProcessing}
              />
              <div className={styles.modeContent}>
                <span className={styles.modeTitle}>✓ COPY MODE (Safe - Recommended)</span>
                <span className={styles.modeDesc}>Duplicates files to destination. Original files remain completely untouched.</span>
              </div>
            </label>
            <label className={`${styles.modeOption} ${options.moveFiles ? styles.selected : ''}`}>
              <input
                type="radio"
                name="operationMode"
                checked={options.moveFiles}
                onChange={() => setOptions(prev => ({ ...prev, moveFiles: true }))}
                disabled={isProcessing}
              />
              <div className={styles.modeContent}>
                <span className={styles.modeTitle}>✗ MOVE MODE (Destructive - Dangerous)</span>
                <span className={styles.modeDesc}>Moves files to destination. ORIGINAL FILES WILL BE PERMANENTLY DELETED!</span>
              </div>
            </label>
          </div>
          {options.moveFiles && (
            <div className={styles.warningBox}>
              <div className={styles.warningIcon}>⚠️ WARNING ⚠️</div>
              <div className={styles.warningText}>
                <strong>DESTRUCTIVE ACTION:</strong> Move mode will <strong>PERMANENTLY DELETE</strong> all original files after organizing.
                <br/>This action <strong>CANNOT BE UNDONE</strong>. Use Copy mode if you have ANY doubt.
                <br/>Only use Move mode if you have confirmed backups!
              </div>
            </div>
          )}
        </div>

        {/* Stats Display */}
        {isProcessing && (
          <div className={styles.section}>
            <h3>// PROGRESS</h3>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <div className={styles.progressText}>
              {progress.current} / {progress.total} files ({Math.round((progress.current / progress.total) * 100)}%)
            </div>
            <div className={styles.status}>{status}</div>
          </div>
        )}

        {/* Statistics */}
        {(stats.processed > 0 || isProcessing) && (
          <div className={styles.section}>
            <h3>// STATISTICS</h3>
            <div className={styles.stats}>
              <div className={styles.statItem}>
                <span>✓ Processed:</span>
                <span className={styles.statValue}>{stats.processed}</span>
              </div>
              <div className={styles.statItem}>
                <span>⏭ Skipped:</span>
                <span className={styles.statValue}>{stats.skipped}</span>
              </div>
              <div className={styles.statItem}>
                <span>♻ Duplicates Found:</span>
                <span className={styles.statValue}>{stats.duplicates}</span>
              </div>
              <div className={styles.statItem}>
                <span>✗ Errors:</span>
                <span className={styles.statValue}>{stats.errors}</span>
              </div>
              <div className={styles.statItem}>
                <span>💾 Space Saved:</span>
                <span className={styles.statValue}>{(stats.spaceSaved / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              {options.applyMetadata && (
                <div className={styles.statItem}>
                  <span>📝 Metadata Applied:</span>
                  <span className={styles.statValue}>{stats.metadataApplied}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actions}>
          <button
            onClick={startOrganizing}
            className={styles.startBtn}
            disabled={isProcessing || !sourceDirectory || !destinationDirectory}
          >
            {isProcessing ? '[ORGANIZING...]' : '[START ORGANIZING]'}
          </button>
          <button
            onClick={() => {
              setLog([]);
              setStats({ processed: 0, skipped: 0, duplicates: 0, spaceSaved: 0, errors: 0 });
            }}
            className={styles.clearBtn}
            disabled={isProcessing}
          >
            [CLEAR LOG]
          </button>
        </div>

        {/* Log Display */}
        {log.length > 0 && (
          <div className={styles.section}>
            <h3>// LOG</h3>
            <div className={styles.logContainer}>
              {log.map((entry, index) => (
                <div key={index} className={`${styles.logEntry} ${styles[entry.type]}`}>
                  <span className={styles.logTime}>[{entry.timestamp}]</span>
                  <span className={styles.logMessage}>{entry.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SortaOrganizer;
