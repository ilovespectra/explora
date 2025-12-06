import { useState, useEffect, useRef } from 'react';
import styles from './CRTFilePreview.module.css';

const CRTFilePreview = ({ file, onClose }) => {
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
  
  // Audio visualization state
  const [visualEffect, setVisualEffect] = useState('soundbars');
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(0));

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

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

  // Audio visualization setup - only after audio starts playing
  useEffect(() => {
    if (previewMode === 'audio' && audioRef.current && isPlaying && !analyserRef.current) {
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
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          
          const updateVisualization = () => {
            if (analyser && canvasRef.current) {
              analyser.getByteFrequencyData(dataArray);
              setFrequencyData(new Uint8Array(dataArray));
              animationRef.current = requestAnimationFrame(updateVisualization);
            }
          };
          
          updateVisualization();
        } catch (error) {
          console.error('Audio analysis setup failed:', error);
          // Visualization failed but audio should still play
        }
      };
      
      setupAudioAnalyser();
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
    
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, width, height);
    
    const drawSoundBars = () => {
      const barWidth = (width / frequencyData.length) * 2.5;
      let x = 0;
      
      for (let i = 0; i < frequencyData.length; i++) {
        const barHeight = (frequencyData[i] / 255) * height;
        
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(1, '#006600');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        
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
        
        const size = 2 + amplitude * 8;
        const hue = (i / frequencyData.length) * 120 + 90;
        
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
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
  }, [frequencyData, visualEffect, previewMode]);

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
    </div>
  );
};

export default CRTFilePreview;
