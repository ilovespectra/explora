import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './CRTFileExplorer.module.css';
import CRTFilePreview from './CRTFilePreview';
import FileManagement from './FileManagement';

const CRTFileExplorer = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentDirectory, setCurrentDirectory] = useState(null);
  const [files, setFiles] = useState([]);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [windowHistory, setWindowHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewMode, setPreviewMode] = useState(null); // 'image', 'text', 'audio', 'video'
  
  // New state for Tools and Media Player
  const [activeTool, setActiveTool] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visualEffect, setVisualEffect] = useState('soundbars'); // 'soundbars', 'waves', 'particles'
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(0));
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  
  // Menu dropdown states
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);
  
  const fileInputRef = useRef(null);
  const directoryHandleRef = useRef(null);
  const screenRef = useRef(null);
  const monitorFrameRef = useRef(null);
  const mediaPlayerAudioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Audio analysis setup
  useEffect(() => {
    if (activeTool === 'mediaPlayer' && mediaPlayerAudioRef.current) {
      const setupAudioAnalyser = async () => {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaElementSource(mediaPlayerAudioRef.current);
          
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          
          analyser.fftSize = 256;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const updateVisualization = () => {
            if (analyser) {
              analyser.getByteFrequencyData(dataArray);
              setFrequencyData(new Uint8Array(dataArray));
              animationRef.current = requestAnimationFrame(updateVisualization);
            }
          };
          
          updateVisualization();
        } catch (error) {
          console.error('Audio analysis setup failed:', error);
        }
      };
      
      setupAudioAnalyser();
      
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [activeTool]);

  // Draw visualization based on selected effect
  useEffect(() => {
    if (!canvasRef.current || !frequencyData.length || activeTool !== 'mediaPlayer') return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, width, height);
    
    const drawSoundBars = () => {
      const barWidth = (width / frequencyData.length) * 2.5;
      let x = 0;
      
      for (let i = 0; i < frequencyData.length; i++) {
        const barHeight = (frequencyData[i] / 255) * height;
        
        // Create gradient for bars
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(1, '#006600');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        
        // Add glow effect
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(x, height - barHeight, barWidth, barHeight);
        ctx.shadowBlur = 0;
        
        x += barWidth + 1;
      }
    };
    
    const drawSoundWaves = () => {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#00ff00';
      
      const sliceWidth = width / frequencyData.length;
      let x = 0;
      
      for (let i = 0; i < frequencyData.length; i++) {
        const v = frequencyData[i] / 255;
        const y = (v * height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
      
      // Add mirror wave
      ctx.beginPath();
      ctx.strokeStyle = '#00aa00';
      ctx.lineWidth = 1;
      
      x = 0;
      for (let i = 0; i < frequencyData.length; i++) {
        const v = frequencyData[i] / 255;
        const y = height - (v * height) / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      ctx.stroke();
    };
    
    const drawParticles = () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2 - 20;
      
      for (let i = 0; i < frequencyData.length; i += 4) {
        const amplitude = frequencyData[i] / 255;
        const angle = (i / frequencyData.length) * Math.PI * 2;
        const radius = amplitude * maxRadius;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Particle size based on amplitude
        const size = 2 + amplitude * 8;
        
        // Color based on frequency
        const hue = (i / frequencyData.length) * 120 + 90; // Green to yellow
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow
        ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };
    
    switch (visualEffect) {
      case 'soundbars':
        drawSoundBars();
        break;
      case 'waves':
        drawSoundWaves();
        break;
      case 'particles':
        drawParticles();
        break;
      default:
        drawSoundBars();
    }
  }, [frequencyData, visualEffect, activeTool]);

  // Tools menu handlers
  const handleToolsMenu = (tool) => {
    setActiveTool(tool);
    if (tool === 'mediaPlayer') {
      // Initialize media player when opened
      if (playlist.length === 0) {
        // Auto-add any audio files from current directory to playlist
        const audioFiles = files.filter(file => 
          file.type === 'file' && file.kind === 'Audio'
        );
        setPlaylist(audioFiles);
      }
    }
  };

  const closeTool = () => {
    setActiveTool(null);
    if (mediaPlayerAudioRef.current) {
      mediaPlayerAudioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Playlist management
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addToPlaylist = (file) => {
    if (file.kind === 'Audio' && !playlist.some(item => item.name === file.name)) {
      setPlaylist(prev => [...prev, file]);
    }
  };

  const removeFromPlaylist = (index) => {
    setPlaylist(prev => prev.filter((_, i) => i !== index));
    if (index === currentTrackIndex) {
      handleNextTrack();
    }
  };

  const clearPlaylist = () => {
    setPlaylist([]);
    setCurrentTrackIndex(0);
    if (mediaPlayerAudioRef.current) {
      mediaPlayerAudioRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Media player controls
  const handlePlayPauseMediaPlayer = () => {
    if (mediaPlayerAudioRef.current) {
      if (isPlaying) {
        mediaPlayerAudioRef.current.pause();
      } else {
        mediaPlayerAudioRef.current.play();
      }
    }
  };

  const handleNextTrack = () => {
    if (playlist.length > 0) {
      const nextIndex = (currentTrackIndex + 1) % playlist.length;
      setCurrentTrackIndex(nextIndex);
    }
  };

  const handlePreviousTrack = () => {
    if (playlist.length > 0) {
      const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
      setCurrentTrackIndex(prevIndex);
    }
  };

  const handleSeekMediaPlayer = (time) => {
    if (mediaPlayerAudioRef.current) {
      mediaPlayerAudioRef.current.currentTime = time;
    }
    setCurrentTime(time);
  };

  const handleTimeUpdateMediaPlayer = () => {
    if (mediaPlayerAudioRef.current) {
      setCurrentTime(mediaPlayerAudioRef.current.currentTime);
      if (!duration) setDuration(mediaPlayerAudioRef.current.duration);
    }
  };

  const handleLoadedMetadataMediaPlayer = () => {
    if (mediaPlayerAudioRef.current) {
      setDuration(mediaPlayerAudioRef.current.duration);
    }
  };

  // Utility function for formatting time
  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to read files from a directory handle
  const readDirectory = async (directoryHandle) => {
    const files = [];
    const folders = [];
    
    try {
      for await (const entry of directoryHandle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          const details = await getFileDetails(file, entry);
          files.push(details);
        } else if (entry.kind === 'directory') {
          const folderDetails = await getFolderDetails(entry);
          folders.push(folderDetails);
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }
    
    return [...folders, ...files];
  };

  const getFileDetails = async (file, handle) => {
    return {
      name: file.name,
      type: 'file',
      size: formatFileSize(file.size),
      modified: new Date(file.lastModified).toLocaleDateString(),
      kind: getFileKind(file.name),
      file: file,
      handle: handle,
      rawSize: file.size,
      rawModified: file.lastModified,
      url: URL.createObjectURL(file) // Create object URL for preview
    };
  };

  const getFolderDetails = async (handle) => {
    return {
      name: handle.name,
      type: 'folder',
      size: '--',
      modified: '--',
      kind: 'Folder',
      handle: handle,
      rawSize: 0,
      rawModified: Date.now()
    };
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileKind = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
      'txt': 'Text Document',
      'pdf': 'PDF Document',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'xls': 'Spreadsheet',
      'xlsx': 'Spreadsheet',
      'jpg': 'Image',
      'jpeg': 'Image',
      'png': 'Image',
      'gif': 'Image',
      'bmp': 'Image',
      'webp': 'Image',
      'mp3': 'Audio',
      'wav': 'Audio',
      'ogg': 'Audio',
      'm4a': 'Audio',
      'mp4': 'Video',
      'mov': 'Video',
      'avi': 'Video',
      'webm': 'Video',
      'zip': 'Archive',
      'rar': 'Archive'
    };
    return types[ext] || 'File';
  };

  // Preview Functions
  const handleFileClick = async (item) => {
    if (item.type === 'folder' && item.handle) {
      try {
        setIsScanning(true);
        const newDirectory = item.handle;
        const directoryFiles = await readDirectory(newDirectory);
        
        const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
        
        setCurrentDirectory(newDirectory);
        setCurrentPath(newPath);
        setFiles(directoryFiles);
        
        // Add to history
        setWindowHistory(prev => [...prev, { 
          handle: newDirectory, 
          path: newPath,
          files: directoryFiles 
        }]);
      } catch (error) {
        console.error('Error navigating to folder:', error);
      } finally {
        setIsScanning(false);
      }
    } else if (item.file) {
      // Handle file preview
      setSelectedFile(item);
      determinePreviewMode(item);
    }
  };

  const determinePreviewMode = (file) => {
    const kind = file.kind.toLowerCase();

    if (kind === 'image') {
      setPreviewMode('image');
      setZoomLevel(1);
    } else if (kind === 'audio') {
      setPreviewMode('audio');
      setIsPlaying(false);
      setCurrentTime(0);
    } else if (kind === 'video') {
      setPreviewMode('video');
      setIsPlaying(false);
      setCurrentTime(0);
    } else if (kind.includes('text') || kind.includes('document')) {
      previewTextFile(file);
    } else {
      setPreviewMode('unsupported');
    }
  };

  const previewTextFile = async (file) => {
    try {
      const text = await file.file.text();
      setSelectedFile(prev => ({ ...prev, textContent: text }));
      setPreviewMode('text');
    } catch (error) {
      console.error('Error reading text file:', error);
      setPreviewMode('unsupported');
    }
  };

  const closePreview = () => {
    setSelectedFile(null);
    setPreviewMode(null);
  };

  // Refresh current directory
  const refreshCurrentDirectory = async () => {
    if (!directoryHandleRef.current) return;
    
    try {
      setIsScanning(true);
      const directoryFiles = await readDirectory(directoryHandleRef.current);
      setFiles(directoryFiles);
    } catch (error) {
      console.error('Error refreshing directory:', error);
    } finally {
      setIsScanning(false);
    }
  };

  // File System Methods
  const connectWithFileSystemAPI = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        setIsScanning(true);
        const directoryHandle = await window.showDirectoryPicker();
        directoryHandleRef.current = directoryHandle;
        setCurrentDirectory(directoryHandle);
        setCurrentPath(`/${directoryHandle.name}`);
        
        const directoryFiles = await readDirectory(directoryHandle);
        setFiles(directoryFiles);
        setIsConnected(true);
        setWindowHistory([{ handle: directoryHandle, path: `/${directoryHandle.name}` }]);
      } catch (error) {
        console.error('Error accessing directory:', error);
      } finally {
        setIsScanning(false);
      }
    } else {
      alert('File System Access API not supported in this browser. Try Chrome or Edge.');
    }
  };

  const handleFileInput = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const fileDetails = selectedFiles.map(file => ({
      name: file.name,
      type: 'file',
      size: formatFileSize(file.size),
      modified: new Date(file.lastModified).toLocaleDateString(),
      kind: getFileKind(file.name),
      file: file,
      rawSize: file.size,
      rawModified: file.lastModified,
      url: URL.createObjectURL(file)
    }));
    
    setFiles(fileDetails);
    setIsConnected(true);
    setCurrentPath('/Selected Files');
    setWindowHistory([{ handle: null, path: '/Selected Files', files: fileDetails }]);
  };

  // Add the missing handleDrop function
  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const items = Array.from(event.dataTransfer.items);
    
    const fileItems = items.filter(item => item.kind === 'file');
    const files = fileItems.map(item => item.getAsFile());
    
    const fileDetails = files.map(file => ({
      name: file.name,
      type: 'file',
      size: formatFileSize(file.size),
      modified: new Date(file.lastModified).toLocaleDateString(),
      kind: getFileKind(file.name),
      file: file,
      rawSize: file.size,
      rawModified: file.lastModified,
      url: URL.createObjectURL(file)
    }));
    
    setFiles(fileDetails);
    setIsConnected(true);
    setCurrentPath('/Dropped Files');
    setWindowHistory([{ handle: null, path: '/Dropped Files', files: fileDetails }]);
  }, []);

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleBack = async () => {
    if (windowHistory.length > 1) {
      try {
        setIsScanning(true);
        const newHistory = [...windowHistory];
        newHistory.pop();
        const previousState = newHistory[newHistory.length - 1];
        
        setCurrentDirectory(previousState.handle);
        setCurrentPath(previousState.path);
        setFiles(previousState.files);
        setWindowHistory(newHistory);
      } catch (error) {
        console.error('Error navigating back:', error);
      } finally {
        setIsScanning(false);
      }
    }
  };

  // Window Controls
  const handleMinimize = () => setIsMinimized(true);
  const handleMaximize = () => setIsMaximized(!isMaximized);
  const handleClose = () => {
    setIsConnected(false);
    setCurrentDirectory(null);
    setFiles([]);
    setCurrentPath('/');
    setWindowHistory([]);
    setIsMaximized(false);
    setIsMinimized(false);
    closePreview();
    closeTool();
  };

  const sortFiles = (filesToSort) => {
    if (!filesToSort || !Array.isArray(filesToSort)) {
      return [];
    }
    
    return [...filesToSort].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'size') {
        aValue = a.rawSize;
        bValue = b.rawSize;
      } else if (sortBy === 'modified') {
        aValue = a.rawModified;
        bValue = b.rawModified;
      } else if (sortBy === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else if (sortBy === 'kind') {
        aValue = a.kind.toLowerCase();
        bValue = b.kind.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // CRT screen effect
  useEffect(() => {
    const screen = screenRef.current;
    if (!screen) return;

    const handleMouseMove = (e) => {
      const rect = screen.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      screen.style.setProperty('--scanline-x', `${x}%`);
      screen.style.setProperty('--scanline-y', `${y}%`);
    };

    screen.addEventListener('mousemove', handleMouseMove);
    return () => screen.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Clean up object URLs on unmount only
  useEffect(() => {
    return () => {
      // Cleanup all file URLs when component unmounts
      files.forEach(file => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedFiles = sortFiles(files);
  const canGoBack = windowHistory.length > 1;

  if (isMinimized) {
    return (
      <div className={styles.minimizedState}>
        <div className={styles.scanlines}></div>
        <div className={styles.restoreButton} onClick={() => setIsMinimized(false)}>
          <div className={styles.crtIcon}>📺</div>
          <span>CRT FILE EXPLORER</span>
          <div className={styles.clickToRestore}>CLICK TO RESTORE</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.crtMonitor}>
      <div 
        className={`${styles.monitorFrame} ${isMaximized ? styles.maximized : ''}`}
        ref={monitorFrameRef}
      >
        <div className={styles.monitorBezel}>
          <div 
            className={styles.monitorScreen} 
            ref={screenRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <div className={styles.scanlines}></div>
            <div className={styles.screenContent}>
              
              {/* Header */}
              <div className={styles.header}>
                <div className={styles.titleBar}>
                  <span className={styles.title}>
                    CRT FILE EXPLORER v2.0 {previewMode && `- PREVIEW: ${selectedFile?.name}`}
                    {activeTool === 'mediaPlayer' && ' - MEDIA PLAYER'}
                  </span>
                  <div className={styles.controls}>
                    <button className={styles.controlBtn} onClick={handleMinimize}>_</button>
                    <button className={styles.controlBtn} onClick={handleMaximize}>
                      {isMaximized ? '❐' : '□'}
                    </button>
                    <button className={styles.controlBtn} onClick={handleClose}>×</button>
                  </div>
                </div>
                
                <div className={styles.menuBar}>
                  {/* File Menu */}
                  <span 
                    className={styles.menuItemWithDropdown}
                    onMouseEnter={() => setShowFileMenu(true)}
                    onMouseLeave={() => setShowFileMenu(false)}
                  >
                    File
                    {showFileMenu && (
                      <div className={styles.dropdownMenu}>
                        <div 
                          className={styles.dropdownItem}
                          onClick={connectWithFileSystemAPI}
                        >
                          Open Directory...
                        </div>
                        <div 
                          className={styles.dropdownItem}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Open Files...
                        </div>
                        <div className={styles.dropdownDivider}></div>
                        <div 
                          className={styles.dropdownItem}
                          onClick={refreshCurrentDirectory}
                        >
                          Refresh
                        </div>
                        <div className={styles.dropdownDivider}></div>
                        <div 
                          className={styles.dropdownItem}
                          onClick={closePreview}
                        >
                          Close Preview
                        </div>
                      </div>
                    )}
                  </span>

                  {/* Edit Menu */}
                  <span 
                    className={styles.menuItemWithDropdown}
                    onMouseEnter={() => setShowEditMenu(true)}
                    onMouseLeave={() => setShowEditMenu(false)}
                  >
                    Edit
                    {showEditMenu && (
                      <div className={styles.dropdownMenu}>
                        <div className={styles.dropdownItem}>
                          Copy Path
                        </div>
                        <div className={styles.dropdownItem}>
                          Select All
                        </div>
                        <div className={styles.dropdownDivider}></div>
                        <div className={styles.dropdownItem}>
                          Preferences...
                        </div>
                      </div>
                    )}
                  </span>

                  {/* View Menu */}
                  <span 
                    className={styles.menuItemWithDropdown}
                    onMouseEnter={() => setShowViewMenu(true)}
                    onMouseLeave={() => setShowViewMenu(false)}
                  >
                    View
                    {showViewMenu && (
                      <div className={styles.dropdownMenu}>
                        <div 
                          className={styles.dropdownItem}
                          onClick={() => setSortBy('name')}
                        >
                          {sortBy === 'name' ? '✓ ' : ''}Sort by Name
                        </div>
                        <div 
                          className={styles.dropdownItem}
                          onClick={() => setSortBy('size')}
                        >
                          {sortBy === 'size' ? '✓ ' : ''}Sort by Size
                        </div>
                        <div 
                          className={styles.dropdownItem}
                          onClick={() => setSortBy('modified')}
                        >
                          {sortBy === 'modified' ? '✓ ' : ''}Sort by Date
                        </div>
                        <div 
                          className={styles.dropdownItem}
                          onClick={() => setSortBy('kind')}
                        >
                          {sortBy === 'kind' ? '✓ ' : ''}Sort by Type
                        </div>
                        <div className={styles.dropdownDivider}></div>
                        <div 
                          className={styles.dropdownItem}
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                          {sortOrder === 'desc' ? '✓ ' : ''}Descending Order
                        </div>
                      </div>
                    )}
                  </span>

                  {/* Tools Menu */}
                  <span 
                    className={styles.menuItemWithDropdown}
                    onMouseEnter={() => setShowToolsMenu(true)}
                    onMouseLeave={() => setShowToolsMenu(false)}
                  >
                    Tools
                    {showToolsMenu && (
                      <div className={styles.dropdownMenu}>
                        <div 
                          className={styles.dropdownItem}
                          onClick={() => handleToolsMenu('mediaPlayer')}
                        >
                          Media Player
                        </div>
                        <div className={styles.dropdownItem}>
                          File Converter
                        </div>
                        <div className={styles.dropdownItem}>
                          System Info
                        </div>
                      </div>
                    )}
                  </span>

                  {/* Help Menu */}
                  <span 
                    className={styles.menuItemWithDropdown}
                    onMouseEnter={() => setShowHelpMenu(true)}
                    onMouseLeave={() => setShowHelpMenu(false)}
                  >
                    Help
                    {showHelpMenu && (
                      <div className={styles.dropdownMenu}>
                        <div className={styles.dropdownItem}>
                          About CRT File Explorer
                        </div>
                        <div className={styles.dropdownDivider}></div>
                        <div className={styles.dropdownItem}>
                          Keyboard Shortcuts
                        </div>
                        <div className={styles.dropdownItem}>
                          Documentation
                        </div>
                      </div>
                    )}
                  </span>
                </div>
              </div>

              {/* Connection Panel */}
              {!isConnected && !activeTool && (
                <div className={styles.connectionPanel}>
                  <div className={styles.connectionStatus}>
                    <div className={styles.statusLight}></div>
                    <span>SYSTEM OFFLINE</span>
                  </div>
                  
                  <div className={styles.connectionOptions}>
                    <button 
                      className={styles.connectButton}
                      onClick={connectWithFileSystemAPI}
                      disabled={isScanning}
                    >
                      {isScanning ? 'SCANNING DRIVES...' : 'CONNECT TO DIRECTORY (CHROME/EDGE)'}
                    </button>
                    
                    <div className={styles.orDivider}>- OR -</div>
                    
                    <button 
                      className={styles.connectButton}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      SELECT FILES
                    </button>
                    
                    <div className={styles.dropZone}>
                      DRAG & DROP FILES HERE
                    </div>
                  </div>

                  {isScanning && (
                    <div className={styles.scanAnimation}>
                      <div className={styles.scanBar}></div>
                    </div>
                  )}

                  <div className={styles.browserSupport}>
                    <strong>Browser Support:</strong><br/>
                    • Chrome/Edge: Full directory access<br/>
                    • Firefox/Safari: File selection & drag-drop<br/>
                    • Mobile: Limited file access
                  </div>
                </div>
              )}

              {/* File Explorer - Show when connected but NOT in preview mode and NOT in tools */}
              {isConnected && !previewMode && !activeTool && (
                <div className={styles.fileExplorer}>
                  {/* Toolbar */}
                  <div className={styles.toolbar}>
                    <button 
                      className={styles.toolbarBtn} 
                      onClick={handleBack} 
                      disabled={!canGoBack}
                    >
                      ← BACK
                    </button>
                    <span className={styles.currentPath}>PATH: {currentPath}</span>
                    <FileManagement 
                      currentDirectory={directoryHandleRef.current}
                      onRefresh={refreshCurrentDirectory}
                    />
                    <button 
                      className={styles.toolbarBtn}
                      onClick={handleClose}
                    >
                      DISCONNECT
                    </button>
                  </div>

                  {/* Sort Headers */}
                  <div className={styles.sortHeaders}>
                    <div 
                      className={`${styles.headerCell} ${styles.nameCell} ${sortBy === 'name' ? styles.activeSort : ''}`}
                      onClick={() => handleSort('name')}
                    >
                      NAME {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div 
                      className={`${styles.headerCell} ${styles.dateCell} ${sortBy === 'modified' ? styles.activeSort : ''}`}
                      onClick={() => handleSort('modified')}
                    >
                      DATE MODIFIED {sortBy === 'modified' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div 
                      className={`${styles.headerCell} ${styles.sizeCell} ${sortBy === 'size' ? styles.activeSort : ''}`}
                      onClick={() => handleSort('size')}
                    >
                      SIZE {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                    <div 
                      className={`${styles.headerCell} ${styles.kindCell} ${sortBy === 'kind' ? styles.activeSort : ''}`}
                      onClick={() => handleSort('kind')}
                    >
                      KIND {sortBy === 'kind' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                  </div>

                  {/* File List */}
                  <div className={styles.fileList}>
                    {sortedFiles.map((file, index) => (
                      <div
                        key={index}
                        className={`${styles.fileRow} ${file.type === 'folder' ? styles.folder : styles.file}`}
                        onClick={() => handleFileClick(file)}
                      >
                        <div className={styles.nameCell}>
                          <span className={styles.fileIcon}>
                            {file.type === 'folder' ? '📁' : getFileIcon(file.kind)}
                          </span>
                          {file.name}
                        </div>
                        <div className={styles.dateCell}>{file.modified}</div>
                        <div className={styles.sizeCell}>{file.size}</div>
                        <div className={styles.kindCell}>{file.kind}</div>
                      </div>
                    ))}
                  </div>

                  {/* Status Bar */}
                  <div className={styles.statusBar}>
                    <span>{sortedFiles.length} items</span>
                    <span>Sort: {sortBy} ({sortOrder})</span>
                    <span>History: {windowHistory.length} levels</span>
                  </div>
                </div>
              )}

              {/* Preview Panel - Show when connected AND in preview mode and NOT in tools */}
              {isConnected && previewMode && !activeTool && selectedFile && (
                <CRTFilePreview 
                  file={selectedFile} 
                  onClose={closePreview}
                />
              )}

              {/* Media Player Tool */}
              {activeTool === 'mediaPlayer' && (
                <div className={styles.mediaPlayerTool}>
                  <div className={styles.toolHeader}>
                    <button className={styles.toolbarBtn} onClick={closeTool}>
                      ← BACK TO FILES
                    </button>
                    <span className={styles.toolTitle}>MEDIA PLAYER</span>
                    <div className={styles.visualEffectSelector}>
                      <span>VISUAL EFFECT:</span>
                      <select 
                        value={visualEffect} 
                        onChange={(e) => setVisualEffect(e.target.value)}
                        className={styles.effectSelect}
                      >
                        <option value="soundbars">Sound Bars</option>
                        <option value="waves">Sound Waves</option>
                        <option value="particles">Particles</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.mediaPlayerContent}>
                    <div className={styles.visualizationSection}>
                      <canvas
                        ref={canvasRef}
                        width={800}
                        height={300}
                        className={styles.visualizationCanvas}
                      />
                    </div>

                    <div className={styles.playlistSection}>
                      <div className={styles.playlistHeader}>
                        <span>PLAYLIST ({playlist.length} tracks)</span>
                        <button 
                          className={styles.playlistBtn}
                          onClick={clearPlaylist}
                          disabled={playlist.length === 0}
                        >
                          CLEAR
                        </button>
                      </div>
                      <div className={styles.playlist}>
                        {playlist.map((track, index) => (
                          <div
                            key={index}
                            className={`${styles.playlistItem} ${
                              index === currentTrackIndex ? styles.currentTrack : ''
                            }`}
                          >
                            <span className={styles.trackName}>{track.name}</span>
                            <div className={styles.trackControls}>
                              {index === currentTrackIndex && (
                                <span className={styles.playingIndicator}>▶</span>
                              )}
                              <button
                                className={styles.removeBtn}
                                onClick={() => removeFromPlaylist(index)}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                        {playlist.length === 0 && (
                          <div className={styles.emptyPlaylist}>
                            No tracks in playlist. Audio files from your directory will appear here automatically.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.playerControls}>
                      <div className={styles.trackInfo}>
                        {playlist[currentTrackIndex] && (
                          <>
                            <span className={styles.currentTrackName}>
                              {playlist[currentTrackIndex].name}
                            </span>
                            <span className={styles.trackDetails}>
                              {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                          </>
                        )}
                      </div>

                      <div className={styles.controlButtons}>
                        <button 
                          className={styles.controlBtn}
                          onClick={handlePreviousTrack}
                          disabled={playlist.length === 0}
                        >
                          ⏮
                        </button>
                        <button 
                          className={styles.playPauseBtn}
                          onClick={handlePlayPauseMediaPlayer}
                          disabled={playlist.length === 0}
                        >
                          {isPlaying ? '❚❚' : '▶'}
                        </button>
                        <button 
                          className={styles.controlBtn}
                          onClick={handleNextTrack}
                          disabled={playlist.length === 0}
                        >
                          ⏭
                        </button>
                      </div>

                      <div className={styles.progressSection}>
                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          value={currentTime}
                          onChange={(e) => handleSeekMediaPlayer(parseFloat(e.target.value))}
                          className={styles.progressBar}
                          disabled={playlist.length === 0}
                        />
                      </div>

                      <div className={styles.volumeSection}>
                        <span className={styles.volumeIcon}>🔊</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="1" 
                          step="0.1" 
                          defaultValue="1" 
                          className={styles.volumeBar}
                          onChange={(e) => {
                            if (mediaPlayerAudioRef.current) {
                              mediaPlayerAudioRef.current.volume = e.target.value;
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hidden audio element for media player */}
                  <audio
                    ref={mediaPlayerAudioRef}
                    src={playlist[currentTrackIndex]?.url}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={handleNextTrack}
                    onTimeUpdate={handleTimeUpdateMediaPlayer}
                    onLoadedMetadata={handleLoadedMetadataMediaPlayer}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={styles.monitorBase}></div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        onChange={handleFileInput}
      />
    </div>
  );
};

const getFileIcon = (kind) => {
  const icons = {
    'Text Document': '📄',
    'PDF Document': '📕',
    'Word Document': '📝',
    'Spreadsheet': '📊',
    'Image': '🖼️',
    'Audio': '🎵',
    'Video': '🎬',
    'Archive': '📦',
    'Folder': '📁',
    'File': '📄'
  };
  return icons[kind] || '📄';
};

export default CRTFileExplorer;