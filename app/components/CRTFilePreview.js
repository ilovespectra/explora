import { useState, useEffect, useRef } from 'react';
import styles from './CRTFilePreview.module.css';

const CRTFilePreview = ({ file, onClose, allAudioFiles = [], onAddToPlaylist, currentPlaylist = [] }) => {
  const [previewMode, setPreviewMode] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [textContent, setTextContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [showPlaylistPanel, setShowPlaylistPanel] = useState(false);
  const [isVisualizerFullscreen, setIsVisualizerFullscreen] = useState(false);
  
  // Audio visualization state
  const [visualEffect, setVisualEffect] = useState('soundbars');
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(0));
  const [colorScale, setColorScale] = useState(0.5); // 0-1 for hue shift
  const [sensitivity, setSensitivity] = useState(1); // 0.5-2.0 for amplitude boost
  const [particleVelocity, setParticleVelocity] = useState(new Map()); // Track particle velocities

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const particleDataRef = useRef([]);
  const lastFrequencyRef = useRef(new Uint8Array(0));
  
  // Frame rate limiting for "on-twos" animation (12fps)
  const lastFrameTimeRef = useRef(0);
  const frameIntervalRef = useRef(1000 / 12); // 12fps = ~83ms per frame

  useEffect(() => {
    if (file) {
      console.log('========== FILE PREVIEW LOADING ==========');
      console.log('File name:', file.name);
      console.log('File size:', file.rawSize);
      console.log('File kind:', file.kind);
      console.log('Has URL:', !!file.url);
      console.log('URL preview:', file.url?.substring(0, 50));
      console.log('Has file object:', !!file.file);
      console.log('File type:', file.file?.type);
      console.log('==========================================');
      
      determinePreviewMode(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      // Don't revoke the URL here - it's managed by the parent component
    };
  }, []);

  // Handle ESC key for fullscreen exit
  useEffect(() => {
    const handleKeydown = (e) => {
      if (e.key === 'Escape' && isVisualizerFullscreen) {
        setIsVisualizerFullscreen(false);
      }
    };
    
    if (isVisualizerFullscreen) {
      window.addEventListener('keydown', handleKeydown);
      return () => window.removeEventListener('keydown', handleKeydown);
    }
  }, [isVisualizerFullscreen]);

  // Audio visualization setup - only after audio starts playing
  useEffect(() => {
    if (previewMode === 'audio' && audioRef.current && isPlaying) {
      // If analyser already exists, just restart the animation loop
      if (analyserRef.current) {
        lastFrameTimeRef.current = 0;
        const updateVisualization = () => {
          if (analyserRef.current && canvasRef.current) {
            const now = performance.now();
            if (now - lastFrameTimeRef.current >= frameIntervalRef.current) {
              const dataArray = new Uint8Array(256);
              analyserRef.current.getByteFrequencyData(dataArray);
              setFrequencyData(new Uint8Array(dataArray));
              lastFrameTimeRef.current = now;
            }
            animationRef.current = requestAnimationFrame(updateVisualization);
          }
        };
        updateVisualization();
        return () => {
          if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
          }
        };
      }

      // Setup new analyser if it doesn't exist
      const setupAudioAnalyser = async () => {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          
          // Resume audio context if suspended
          if (audioContext.state === 'suspended') {
            await audioContext.resume();
          }
          
          const source = audioContext.createMediaElementSource(audioRef.current);
          
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          
          analyser.fftSize = 256;
          
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          lastFrameTimeRef.current = 0;
          
          const updateVisualization = () => {
            if (analyser && canvasRef.current) {
              const now = performance.now();
              if (now - lastFrameTimeRef.current >= frameIntervalRef.current) {
                const dataArray = new Uint8Array(256);
                analyser.getByteFrequencyData(dataArray);
                setFrequencyData(new Uint8Array(dataArray));
                lastFrameTimeRef.current = now;
              }
              animationRef.current = requestAnimationFrame(updateVisualization);
            }
          };
          
          updateVisualization();
        } catch (error) {
          console.error('Audio analysis setup failed:', error);
        }
      };
      
      setupAudioAnalyser();
    } else if (!isPlaying && animationRef.current) {
      // Stop animation when audio pauses
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [previewMode, isPlaying]);

  // Draw visualization
  useEffect(() => {
    if (!canvasRef.current || !frequencyData.length || previewMode !== 'audio') return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Apply sensitivity multiplier to frequency data
    const amplifiedData = new Uint8Array(frequencyData.map(v => 
      Math.min(255, v * (0.5 + sensitivity * 1.5))
    ));
    
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, width, height);
    
    const drawSoundBars = () => {
      const barWidth = (width / amplifiedData.length) * 2.5;
      let x = 0;
      
      // Calculate average frequency for smoother transitions
      const avgFreq = amplifiedData.reduce((a, b) => a + b) / amplifiedData.length;
      
      for (let i = 0; i < amplifiedData.length; i++) {
        // Smooth bar transitions by comparing with last frame
        const lastValue = lastFrequencyRef.current[i] || 0;
        const smoothValue = lastValue * 0.6 + amplifiedData[i] * 0.4;
        const barHeight = (smoothValue / 255) * height * 0.95;
        
        // Dynamic color based on bar height and colorScale - FIX: Apply colorScale to hue range
        const baseHue = 120; // Green base
        const hueRange = colorScale * 240; // 0-240 hue shift based on colorScale
        const hue = (i / amplifiedData.length) * hueRange + baseHue;
        const saturation = Math.max(50, 100 - (barHeight / height) * 30);
        const lightness = Math.max(30, 60 - (barHeight / height) * 20);
        
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, `hsl(${hue % 360}, ${saturation}%, ${lightness + 20}%)`);
        gradient.addColorStop(1, `hsl(${hue % 360}, ${saturation}%, ${lightness}%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        
        // Enhanced glow effect
        ctx.shadowColor = `hsl(${hue % 360}, 100%, 50%)`;
        ctx.shadowBlur = 15 + (barHeight / height) * 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.strokeStyle = `hsl(${hue % 360}, 100%, 60%)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, height - barHeight, barWidth - 1, barHeight);
        ctx.shadowBlur = 0;
        
        x += barWidth;
      }
      
      // Store for smoothing
      lastFrequencyRef.current = new Uint8Array(amplifiedData);
    };
    
    const drawSoundWaves = () => {
      const sliceWidth = width / amplifiedData.length;
      const centerY = height / 2;
      
      // Calculate average frequency for wave amplitude
      const avgFreq = amplifiedData.reduce((a, b) => a + b, 0) / amplifiedData.length;
      const waveAmplitude = (avgFreq / 255) * (height * 0.35);
      
      // Draw main wave
      ctx.beginPath();
      ctx.lineWidth = 3;
      
      const hue = colorScale * 360;
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      
      let x = 0;
      for (let i = 0; i < amplifiedData.length; i++) {
        const v = amplifiedData[i] / 255;
        const y = centerY - waveAmplitude * (v - 0.5) * 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      ctx.stroke();
      
      // Draw mirror wave with glow
      ctx.beginPath();
      ctx.strokeStyle = `hsl(${(hue + 180) % 360}, 100%, 40%)`;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      
      x = 0;
      for (let i = 0; i < amplifiedData.length; i++) {
        const v = amplifiedData[i] / 255;
        const y = centerY + waveAmplitude * (v - 0.5) * 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      // Draw fill between waves
      ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.1)`;
      ctx.fill();
    };
    
    const drawParticles = () => {
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(width, height) / 2.5;
      
      // Initialize particles if needed - one particle per frequency bin for full coverage
      if (particleDataRef.current.length === 0) {
        for (let i = 0; i < amplifiedData.length; i++) {
          particleDataRef.current.push({
            index: i,
            radius: 0,
            velocity: 0,
            targetRadius: 0,
            decay: 0.92
          });
        }
      }
      
      // Update particles based on frequency - each particle gets its own frequency bin
      for (let i = 0; i < particleDataRef.current.length && i < amplifiedData.length; i++) {
        const particle = particleDataRef.current[i];
        const amplitude = amplifiedData[i] / 255;
        
        // Target radius with smooth easing
        particle.targetRadius = amplitude * maxRadius;
        
        // Smooth follow with momentum
        particle.radius = particle.radius * 0.7 + particle.targetRadius * 0.3;
        
        // Calculate velocity for motion trails
        particle.velocity = particle.targetRadius - particle.radius;
      }
      
      // Draw particles with trails
      for (let i = 0; i < particleDataRef.current.length && i < amplifiedData.length; i++) {
        const particle = particleDataRef.current[i];
        const angle = (i / amplifiedData.length) * Math.PI * 2;
        
        const x = centerX + Math.cos(angle) * particle.radius;
        const y = centerY + Math.sin(angle) * particle.radius;
        
        // Size based on frequency and velocity
        const baseSize = 3 + particle.radius / maxRadius * 12;
        const velocitySize = Math.abs(particle.velocity) * 5;
        const size = baseSize + velocitySize;
        
        // Dynamic color based on colorScale
        const hueRange = colorScale * 360;
        const baseHue = (i / amplifiedData.length) * hueRange + 120;
        const saturation = 100;
        const lightness = 50 + Math.sin(Date.now() * 0.003 + i) * 20;
        
        // Draw particle with glow
        ctx.fillStyle = `hsl(${baseHue % 360}, ${saturation}%, ${lightness}%)`;
        ctx.shadowColor = `hsl(${baseHue % 360}, 100%, 50%)`;
        ctx.shadowBlur = 20 + size * 2;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw motion trails
        if (Math.abs(particle.velocity) > 5) {
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = `hsl(${baseHue % 360}, ${saturation}%, ${lightness - 20}%)`;
          
          const trailLength = Math.abs(particle.velocity) * 3;
          const trailX = x - Math.cos(angle) * trailLength;
          const trailY = y - Math.sin(angle) * trailLength;
          
          ctx.beginPath();
          ctx.arc(trailX, trailY, size * 0.6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.globalAlpha = 1;
        }
        
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
  }, [frequencyData, visualEffect, previewMode, colorScale, sensitivity]);

  const determinePreviewMode = async (file) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const kind = file.kind.toLowerCase();
      const fileName = file.name.toLowerCase();
      
      // Get the actual extension, stripping .part if present
      let extension = '';
      if (fileName.endsWith('.part')) {
        // Extract extension before .part (e.g., "file.mp3.part" -> "mp3")
        const nameWithoutPart = fileName.slice(0, -5); // Remove .part
        const lastDot = nameWithoutPart.lastIndexOf('.');
        if (lastDot !== -1) {
          extension = nameWithoutPart.slice(lastDot);
        }
      } else {
        const lastDot = fileName.lastIndexOf('.');
        if (lastDot !== -1) {
          extension = fileName.slice(lastDot);
        }
      }
      
      // Check by kind first, then by extension
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma', '.opus'];
      const videoExtensions = ['.mp4', '.webm', '.ogv', '.mov', '.avi', '.mkv', '.wmv'];
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
      const textExtensions = ['.txt', '.json', '.js', '.css', '.html', '.md', '.xml', '.log', '.csv'];
      
      // Validate that we have a valid file object and URL
      if (!file.file) {
        throw new Error('No file object available');
      }
      if (!file.url) {
        throw new Error('No file URL available');
      }
      
      // Check file size
      if (file.rawSize === 0) {
        setError('⚠️ Warning: File is empty (0 bytes)');
      }
      
      if (kind === 'image' || kind.includes('image') || imageExtensions.includes(extension)) {
        setPreviewMode('image');
        setZoomLevel(1);
      } else if (kind === 'audio' || kind.includes('audio') || audioExtensions.includes(extension)) {
        setPreviewMode('audio');
        // Warn if it's a .part file
        if (fileName.endsWith('.part')) {
          setError('⚠️ Warning: This is a .part file (incomplete download). Playback may fail.');
        }
      } else if (kind === 'video' || kind.includes('video') || videoExtensions.includes(extension)) {
        setPreviewMode('video');
        if (fileName.endsWith('.part')) {
          setError('⚠️ Warning: This is a .part file (incomplete download). Playback may fail.');
        }
      } else if (kind.includes('text') || kind.includes('document') || textExtensions.includes(extension)) {
        await previewTextFile(file);
      } else if (extension === '.pdf') {
        setPreviewMode('pdf');
      } else {
        setError(`Unsupported file type: ${file.kind}${extension ? ` (${extension})` : ''}`);
        setPreviewMode('unsupported');
      }
    } catch (err) {
      console.error('Error determining preview mode:', err);
      setError(err.message);
      setPreviewMode('error');
    } finally {
      setIsLoading(false);
    }
  };

  const previewTextFile = async (file) => {
    try {
      const text = await file.file.text();
      setTextContent(text);
      setPreviewMode('text');
    } catch (error) {
      console.error('Error reading text file:', error);
      setError('Failed to read text file');
      setPreviewMode('error');
    }
  };

  // Media Controls
  const handlePlayPause = async () => {
    const media = previewMode === 'audio' ? audioRef.current : videoRef.current;
    if (media) {
      try {
        if (isPlaying) {
          media.pause();
        } else {
          // Clear any previous errors
          setError(null);
          
          // Ensure media is loaded
          if (media.readyState < 2) {
            media.load();
          }
          
          await media.play();
        }
      } catch (err) {
        console.error('Playback error:', err);
        // Only show error if it's not an abort error (user interrupted)
        if (err.name !== 'AbortError') {
          setError('Failed to play media. Please try again.');
        }
      }
    }
  };

  const handleSeek = (e) => {
    const media = previewMode === 'audio' ? audioRef.current : videoRef.current;
    if (media) {
      const percent = e.target.value / 100;
      media.currentTime = percent * duration;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    const media = previewMode === 'audio' ? audioRef.current : videoRef.current;
    if (media) {
      media.volume = newVolume;
    }
  };

  const handleMuteToggle = () => {
    const media = previewMode === 'audio' ? audioRef.current : videoRef.current;
    if (media) {
      media.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSpeedChange = (speed) => {
    const media = previewMode === 'audio' ? audioRef.current : videoRef.current;
    if (media) {
      media.playbackRate = speed;
      setPlaybackRate(speed);
    }
    setShowSpeedControl(false);
  };

  const handleTimeUpdate = () => {
    const media = previewMode === 'audio' ? audioRef.current : videoRef.current;
    if (media) {
      setCurrentTime(media.currentTime);
      if (!duration || isNaN(duration)) {
        setDuration(media.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const media = previewMode === 'audio' ? audioRef.current : videoRef.current;
    if (media) {
      setDuration(media.duration);
      media.volume = volume;
    }
  };

  const handleSkip = (seconds) => {
    const media = previewMode === 'audio' ? audioRef.current : videoRef.current;
    if (media) {
      media.currentTime = Math.max(0, Math.min(media.currentTime + seconds, duration));
    }
  };

  // Image Controls
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.25));
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
  };

  const handleImageRotate = () => {
    if (imageRef.current) {
      const currentRotation = imageRef.current.style.transform.match(/rotate\((\d+)deg\)/);
      const rotation = currentRotation ? parseInt(currentRotation[1]) : 0;
      imageRef.current.style.transform = `rotate(${rotation + 90}deg) scale(${zoomLevel})`;
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 0.5) return '🔉';
    return '🔊';
  };

  if (isLoading) {
    return (
      <div className={styles.previewOverlay}>
        <div className={styles.previewWindow}>
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>Loading...</span>
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          </div>
          <div className={styles.loadingContainer}>
            <div className={styles.scanAnimation}>
              <div className={styles.scanBar}></div>
            </div>
            <p>SCANNING FILE...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.previewOverlay} onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className={styles.previewWindow}>
        {/* Header */}
        <div className={styles.previewHeader}>
          <span className={styles.previewTitle}>
            PREVIEW: {file?.name}
          </span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* File Info Bar */}
        <div className={styles.fileInfoBar}>
          <span>Type: {file?.kind}</span>
          <span>Size: {formatFileSize(file?.rawSize || 0)}</span>
          <span>Modified: {file?.modified}</span>
        </div>

        {/* Preview Content */}
        <div className={styles.previewContent} ref={containerRef}>
          {error && (
            <div className={styles.errorMessage}>
              <div className={styles.errorIcon}>⚠</div>
              <p>ERROR: {error}</p>
            </div>
          )}

          {previewMode === 'image' && (
            <div className={styles.imagePreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={file?.url}
                alt={file?.name}
                style={{ transform: `scale(${zoomLevel})` }}
                onLoad={() => setIsLoading(false)}
                onError={() => setError('Failed to load image')}
              />
            </div>
          )}

          {previewMode === 'audio' && (
            <div className={styles.audioPreview}>
              <div className={styles.visualizationSection}>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className={styles.visualizationCanvas}
                />
                <div className={styles.visualEffectSelector}>
                  <label>Effect:</label>
                  <select 
                    value={visualEffect} 
                    onChange={(e) => setVisualEffect(e.target.value)}
                    className={styles.effectSelect}
                  >
                    <option value="soundbars">Sound Bars</option>
                    <option value="waves">Sound Waves</option>
                    <option value="particles">Particles</option>
                  </select>
                  <button 
                    className={styles.fullscreenBtn}
                    onClick={() => setIsVisualizerFullscreen(true)}
                    title="Expand to fullscreen"
                  >
                    [⛶]
                  </button>
                </div>
                
                {/* Visualization Controls */}
                <div className={styles.visualizationControls}>
                  <div className={styles.controlRow}>
                    <label className={styles.controlLabel}>Color Scale</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      value={colorScale}
                      onChange={(e) => setColorScale(parseFloat(e.target.value))}
                      className={styles.controlSlider}
                      title="Adjust color spectrum"
                    />
                    <span className={styles.controlValue}>{Math.round(colorScale * 100)}%</span>
                  </div>
                  
                  <div className={styles.controlRow}>
                    <label className={styles.controlLabel}>Sensitivity</label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2" 
                      step="0.1"
                      value={sensitivity}
                      onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                      className={styles.controlSlider}
                      title="Adjust amplitude sensitivity"
                    />
                    <span className={styles.controlValue}>{sensitivity.toFixed(1)}x</span>
                  </div>
                </div>
              </div>
              <div className={styles.audioInfo}>
                <div className={styles.audioIcon}>🎵</div>
                <div className={styles.trackInfo}>
                  <div className={styles.trackName}>{file?.name}</div>
                  <div className={styles.trackDetails}>
                    {formatFileSize(file?.rawSize || 0)} • {file?.kind}
                  </div>
                </div>
              </div>

              {/* Playlist Panel */}
              <div className={styles.playlistPanelContainer}>
                <button 
                  className={styles.playlistPanelToggle}
                  onClick={() => setShowPlaylistPanel(!showPlaylistPanel)}
                  title="Toggle playlist panel"
                >
                  {showPlaylistPanel ? '▼' : '▶'} PLAYLIST ({currentPlaylist.length})
                </button>

                {showPlaylistPanel && (
                  <div className={styles.playlistPanel}>
                    <div className={styles.playlistAvailable}>
                      <div className={styles.playlistSectionTitle}>Available Audio Files ({allAudioFiles.length})</div>
                      <div className={styles.availableList}>
                        {allAudioFiles.map((audioFile, idx) => {
                          const isInPlaylist = currentPlaylist.some(p => p.name === audioFile.name);
                          return (
                            <div key={idx} className={styles.availableItem}>
                              <span className={styles.itemName}>{audioFile.name}</span>
                              <button
                                className={styles.addToPlaylistBtn}
                                onClick={() => onAddToPlaylist && onAddToPlaylist(audioFile)}
                                disabled={isInPlaylist}
                                title={isInPlaylist ? 'Already in playlist' : 'Add to playlist'}
                              >
                                {isInPlaylist ? '✓' : '+'}
                              </button>
                            </div>
                          );
                        })}
                        {allAudioFiles.length === 0 && (
                          <div className={styles.emptyMessage}>No audio files in directory</div>
                        )}
                      </div>
                    </div>

                    <div className={styles.playlistCurrent}>
                      <div className={styles.playlistSectionTitle}>Current Playlist ({currentPlaylist.length})</div>
                      <div className={styles.currentList}>
                        {currentPlaylist.map((track, idx) => (
                          <div key={idx} className={styles.playlistItemInPanel}>
                            <span className={styles.itemNumber}>{idx + 1}.</span>
                            <span className={styles.itemName}>{track.name}</span>
                            <span className={styles.itemSize}>{formatFileSize(track.rawSize || 0)}</span>
                          </div>
                        ))}
                        {currentPlaylist.length === 0 && (
                          <div className={styles.emptyMessage}>Playlist is empty</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <audio
                ref={audioRef}
                src={file?.url}
                preload="metadata"
                onLoadStart={() => {
                  console.log('Audio load started:', file?.name);
                }}
                onLoadedData={() => {
                  console.log('Audio data loaded:', file?.name);
                }}
                onCanPlay={() => {
                  console.log('Audio can play:', file?.name);
                }}
                onCanPlayThrough={() => {
                  console.log('Audio can play through:', file?.name);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  const target = e.currentTarget;
                  const error = target.error;
                  
                  console.error('========== AUDIO ERROR ==========');
                  console.error('Error object:', error);
                  console.error('Error code:', error?.code);
                  console.error('Error message:', error?.message);
                  console.error('File name:', file?.name);
                  console.error('File size:', file?.rawSize);
                  console.error('File type:', file?.file?.type);
                  console.error('Source URL:', target.src);
                  console.error('Current source:', target.currentSrc);
                  console.error('Network state:', target.networkState);
                  console.error('Ready state:', target.readyState);
                  console.error('Has URL:', !!file?.url);
                  console.error('Has file object:', !!file?.file);
                  console.error('================================');
                  
                  let errorMessage = 'Failed to load audio file';
                  
                  // Check if it's a .part file
                  if (file?.name?.endsWith('.part')) {
                    errorMessage = 'Cannot play .part file - file is incomplete or corrupted. This appears to be a partial download.';
                  } else if (error?.code === 3) {
                    errorMessage = `Audio format not supported by your browser (${file?.name})`;
                  } else if (error?.code === 4) {
                    errorMessage = 'Audio file not found or cannot be accessed';
                  } else if (error?.code === 2) {
                    errorMessage = 'Network error while loading audio';
                  } else if (error?.code === 1) {
                    errorMessage = 'Audio loading was aborted';
                  } else if (!file?.url) {
                    errorMessage = 'No file URL available - file may not be loaded correctly';
                  } else {
                    errorMessage = `Cannot play audio file: ${file?.name || 'unknown'}`;
                  }
                  
                  setError(errorMessage);
                }}
              />
            </div>
          )}

          {previewMode === 'video' && (
            <div className={styles.videoPreview}>
              <video
                ref={videoRef}
                src={file?.url}
                preload="metadata"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={(e) => {
                  const target = e.currentTarget;
                  const error = target.error;
                  console.error('Video error:', {
                    code: error?.code,
                    message: error?.message,
                    src: target.src,
                    networkState: target.networkState,
                    readyState: target.readyState
                  });
                  
                  let errorMessage = 'Failed to load video file';
                  if (error) {
                    switch (error.code) {
                      case 1:
                        errorMessage = 'Video loading aborted';
                        break;
                      case 2:
                        errorMessage = 'Network error while loading video';
                        break;
                      case 3:
                        errorMessage = 'Video format not supported';
                        break;
                      case 4:
                        errorMessage = 'Video source not found';
                        break;
                      default:
                        errorMessage = 'Failed to load video file';
                    }
                  }
                  setError(errorMessage);
                }}
                controls={false}
              />
            </div>
          )}

          {previewMode === 'text' && (
            <div className={styles.textPreview}>
              <pre className={styles.textContent}>{textContent}</pre>
            </div>
          )}

          {previewMode === 'pdf' && (
            <div className={styles.pdfPreview}>
              <div className={styles.unsupportedIcon}>📄</div>
              <p>PDF Preview not available in browser</p>
              <p className={styles.hint}>Use your system&apos;s PDF viewer to open this file</p>
            </div>
          )}

          {previewMode === 'unsupported' && (
            <div className={styles.unsupportedPreview}>
              <div className={styles.unsupportedIcon}>📁</div>
              <p>{error || 'Preview not available for this file type'}</p>
              <p className={styles.hint}>{file?.kind} • {formatFileSize(file?.rawSize || 0)}</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className={styles.controlsPanel}>
          {/* Image Controls */}
          {previewMode === 'image' && (
            <div className={styles.imageControls}>
              <div className={styles.controlGroup}>
                <button className={styles.controlButton} onClick={handleZoomOut} title="Zoom Out">
                  [-]
                </button>
                <span className={styles.zoomLevel}>{Math.round(zoomLevel * 100)}%</span>
                <button className={styles.controlButton} onClick={handleZoomIn} title="Zoom In">
                  [+]
                </button>
                <button className={styles.controlButton} onClick={handleZoomReset} title="Reset Zoom">
                  [1:1]
                </button>
                <button className={styles.controlButton} onClick={handleImageRotate} title="Rotate">
                  [↻]
                </button>
              </div>
            </div>
          )}

          {/* Media Controls */}
          {(previewMode === 'audio' || previewMode === 'video') && (
            <div className={styles.mediaControls}>
              <div className={styles.progressBar}>
                <span className={styles.timeDisplay}>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(currentTime / duration) * 100 || 0}
                  onChange={handleSeek}
                  className={styles.seekBar}
                />
                <span className={styles.timeDisplay}>{formatTime(duration)}</span>
              </div>

              <div className={styles.playbackControls}>
                <button 
                  className={styles.controlButton}
                  onClick={() => handleSkip(-10)}
                  title="Rewind 10s"
                >
                  [⏮ 10s]
                </button>
                <button 
                  className={styles.playButton}
                  onClick={handlePlayPause}
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? '[⏸]' : '[▶]'}
                </button>
                <button 
                  className={styles.controlButton}
                  onClick={() => handleSkip(10)}
                  title="Forward 10s"
                >
                  [10s ⏭]
                </button>

                <div className={styles.volumeControl}>
                  <button
                    className={styles.controlButton}
                    onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    [{getVolumeIcon()}]
                  </button>
                  {showVolumeSlider && (
                    <div className={styles.volumeSlider}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume * 100}
                        onChange={handleVolumeChange}
                        className={styles.volumeRange}
                        orient="vertical"
                      />
                      <button
                        className={styles.controlButton}
                        onClick={handleMuteToggle}
                        style={{ marginTop: '4px', fontSize: '10px' }}
                      >
                        [MUTE]
                      </button>
                    </div>
                  )}
                </div>

                <div className={styles.speedControl}>
                  <button
                    className={styles.controlButton}
                    onClick={() => setShowSpeedControl(!showSpeedControl)}
                    title="Playback Speed"
                  >
                    [{playbackRate}x]
                  </button>
                  {showSpeedControl && (
                    <div className={styles.speedMenu}>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                        <button
                          key={speed}
                          className={`${styles.speedOption} ${playbackRate === speed ? styles.activeSpeed : ''}`}
                          onClick={() => handleSpeedChange(speed)}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Text Controls */}
          {previewMode === 'text' && (
            <div className={styles.textControls}>
              <span className={styles.textInfo}>
                Lines: {textContent.split('\n').length} • 
                Characters: {textContent.length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Visualizer */}
      {isVisualizerFullscreen && previewMode === 'audio' && (
        <div 
          className={styles.fullscreenVisualizerOverlay} 
          onClick={(e) => {
            // Only close if clicking the overlay background itself
            if (e.target === e.currentTarget) {
              setIsVisualizerFullscreen(false);
            }
          }}
        >
          <div className={styles.fullscreenVisualizerContainer}>
            <button 
              className={styles.exitFullscreenBtn}
              onClick={() => setIsVisualizerFullscreen(false)}
              title="Exit fullscreen (ESC)"
            >
              ✕ EXIT
            </button>
            
            <canvas
              ref={canvasRef}
              width={window.innerWidth - 40}
              height={window.innerHeight - 100}
              className={styles.fullscreenCanvas}
            />
            
            <div className={styles.fullscreenControls}>
              <div className={styles.controlRow}>
                <label className={styles.controlLabel}>Color Scale</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={colorScale}
                  onChange={(e) => setColorScale(parseFloat(e.target.value))}
                  className={styles.controlSlider}
                />
                <span className={styles.controlValue}>{Math.round(colorScale * 100)}%</span>
              </div>
              
              <div className={styles.controlRow}>
                <label className={styles.controlLabel}>Sensitivity</label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2" 
                  step="0.1"
                  value={sensitivity}
                  onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                  className={styles.controlSlider}
                />
                <span className={styles.controlValue}>{sensitivity.toFixed(1)}x</span>
              </div>

              <div className={styles.controlRow}>
                <label className={styles.controlLabel}>Effect</label>
                <select 
                  value={visualEffect} 
                  onChange={(e) => setVisualEffect(e.target.value)}
                  className={styles.effectSelectFullscreen}
                >
                  <option value="soundbars">Sound Bars</option>
                  <option value="waves">Sound Waves</option>
                  <option value="particles">Particles</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRTFilePreview;
