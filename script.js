// ==================== STREAMULTRA - ADVANCED VIDEO PLAYER ====================

document.addEventListener('DOMContentLoaded', () => {
    // ==================== DOM ELEMENTS ====================
    const videoPlayer = document.getElementById('videoPlayer');
    const videoWrapper = document.getElementById('videoWrapper');
    const videoControls = document.getElementById('videoControls');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playPauseIcon = document.getElementById('playPauseIcon');
    const rewindBtn = document.getElementById('rewindBtn');
    const forwardBtn = document.getElementById('forwardBtn');
    const muteBtn = document.getElementById('muteBtn');
    const volumeIcon = document.getElementById('volumeIcon');
    const volumeSlider = document.getElementById('volumeSlider');
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressBuffer = document.getElementById('progressBuffer');
    const progressThumb = document.getElementById('progressThumb');
    const timeDisplay = document.getElementById('timeDisplay');
    const speedSelector = document.getElementById('speedSelector');
    const pipBtn = document.getElementById('pipBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const urlForm = document.getElementById('urlForm');
    const urlInput = document.getElementById('urlInput');
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const navbar = document.getElementById('navbar');
    const toast = document.getElementById('toast');

    // ==================== STATE MANAGEMENT ====================
    let hls = null;
    let controlsTimeout;
    let isDragging = false;
    let lastVolume = 1;

    // ==================== THEME MANAGEMENT ====================
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        showToast(`Theme switched to ${newTheme} mode`, 'info');
    }

    function updateThemeIcon(theme) {
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }

    themeToggle.addEventListener('click', toggleTheme);
    initTheme();

    // ==================== NAVBAR SCROLL EFFECT ====================
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // ==================== VIDEO LOADING ====================
    function loadVideo(url, isHLS = false) {
        // Clean up existing HLS instance
        if (hls) {
            hls.destroy();
            hls = null;
        }

        // Check if URL is HLS
        const isHLSUrl = url.includes('.m3u8') || isHLS;

        if (isHLSUrl && Hls.isSupported()) {
            // Initialize HLS for adaptive streaming
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
            });

            hls.loadSource(url);
            hls.attachMedia(videoPlayer);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                showToast('Video loaded successfully!', 'success');
                videoPlayer.play().catch(e => console.log('Auto-play prevented'));
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    showToast('Error loading video', 'error');
                    console.error('HLS Error:', data);
                }
            });

            // Monitor quality changes
            hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
                const level = hls.levels[data.level];
                if (level) {
                    console.log(`Quality switched to: ${level.height}p`);
                }
            });

        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            videoPlayer.src = url;
            videoPlayer.addEventListener('loadedmetadata', () => {
                showToast('Video loaded successfully!', 'success');
            });
        } else {
            // Regular video file
            videoPlayer.src = url;
            videoPlayer.load();
            videoPlayer.addEventListener('loadedmetadata', () => {
                showToast('Video loaded successfully!', 'success');
            });
        }
    }

    // URL Form Submission
    urlForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = urlInput.value.trim();
        if (url) {
            loadVideo(url);
            urlInput.value = '';
        }
    });

    // File Upload
    function handleFileUpload(file) {
        if (file && file.type.startsWith('video/')) {
            const url = URL.createObjectURL(file);
            loadVideo(url);
            showToast(`Loaded: ${file.name}`, 'success');
        } else {
            showToast('Please select a valid video file', 'error');
        }
    }

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));

    // Drag and Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    });

    // ==================== PLAYBACK CONTROLS ====================
    function togglePlayPause() {
        if (videoPlayer.paused || videoPlayer.ended) {
            videoPlayer.play();
            playPauseIcon.textContent = '⏸️';
        } else {
            videoPlayer.pause();
            playPauseIcon.textContent = '▶️';
        }
    }

    playPauseBtn.addEventListener('click', togglePlayPause);

    videoPlayer.addEventListener('play', () => {
        playPauseIcon.textContent = '⏸️';
        startControlsTimeout();
    });

    videoPlayer.addEventListener('pause', () => {
        playPauseIcon.textContent = '▶️';
        clearTimeout(controlsTimeout);
    });

    function rewind(seconds = 10) {
        videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - seconds);
        showToast(`⏪ -${seconds}s`, 'info');
    }

    function forward(seconds = 10) {
        videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + seconds);
        showToast(`⏩ +${seconds}s`, 'info');
    }

    rewindBtn.addEventListener('click', () => rewind());
    forwardBtn.addEventListener('click', () => forward());

    // ==================== VOLUME CONTROL ====================
    function updateVolume(value) {
        videoPlayer.volume = value;
        updateVolumeIcon(value);
        if (value > 0) {
            lastVolume = value;
        }
    }

    function updateVolumeIcon(volume) {
        if (volume === 0) {
            volumeIcon.textContent = '🔇';
        } else if (volume < 0.5) {
            volumeIcon.textContent = '🔉';
        } else {
            volumeIcon.textContent = '🔊';
        }
    }

    function toggleMute() {
        if (videoPlayer.volume > 0) {
            lastVolume = videoPlayer.volume;
            videoPlayer.volume = 0;
            volumeSlider.value = 0;
        } else {
            videoPlayer.volume = lastVolume || 1;
            volumeSlider.value = videoPlayer.volume;
        }
        updateVolumeIcon(videoPlayer.volume);
    }

    muteBtn.addEventListener('click', toggleMute);
    volumeSlider.addEventListener('input', (e) => updateVolume(parseFloat(e.target.value)));

    // ==================== PROGRESS BAR ====================
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function updateProgress() {
        const progress = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        progressFill.style.width = `${progress}%`;
        progressThumb.style.left = `${progress}%`;
        timeDisplay.textContent = `${formatTime(videoPlayer.currentTime)} / ${formatTime(videoPlayer.duration)}`;
    }

    function updateBuffer() {
        if (videoPlayer.buffered.length > 0) {
            const bufferedEnd = videoPlayer.buffered.end(videoPlayer.buffered.length - 1);
            const bufferProgress = (bufferedEnd / videoPlayer.duration) * 100;
            progressBuffer.style.width = `${bufferProgress}%`;
        }
    }

    videoPlayer.addEventListener('timeupdate', () => {
        updateProgress();
        updateBuffer();
    });

    videoPlayer.addEventListener('progress', updateBuffer);

    // Seek functionality
    function seek(e) {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        videoPlayer.currentTime = pos * videoPlayer.duration;
    }

    progressContainer.addEventListener('click', seek);

    // Drag to seek
    progressContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        seek(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            seek(e);
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // ==================== PLAYBACK SPEED ====================
    speedSelector.addEventListener('change', (e) => {
        videoPlayer.playbackRate = parseFloat(e.target.value);
        showToast(`Speed: ${e.target.value}x`, 'info');
    });

    // ==================== PICTURE-IN-PICTURE ====================
    async function togglePiP() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await videoPlayer.requestPictureInPicture();
            }
        } catch (error) {
            showToast('Picture-in-Picture not supported', 'error');
            console.error('PiP Error:', error);
        }
    }

    pipBtn.addEventListener('click', togglePiP);

    // ==================== FULLSCREEN ====================
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            videoWrapper.requestFullscreen().catch(err => {
                showToast('Fullscreen not supported', 'error');
                console.error('Fullscreen Error:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Update fullscreen button icon
    document.addEventListener('fullscreenchange', () => {
        if (document.fullscreenElement) {
            fullscreenBtn.textContent = '⛶';
        } else {
            fullscreenBtn.textContent = '⛶';
        }
    });

    // ==================== CONTROLS AUTO-HIDE ====================
    function showControls() {
        videoControls.style.opacity = '1';
        startControlsTimeout();
    }

    function hideControls() {
        if (!videoPlayer.paused) {
            videoControls.style.opacity = '0';
        }
    }

    function startControlsTimeout() {
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(hideControls, 3000);
    }

    videoWrapper.addEventListener('mousemove', showControls);
    videoWrapper.addEventListener('click', togglePlayPause);

    // ==================== KEYBOARD SHORTCUTS ====================
    document.addEventListener('keydown', (e) => {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch(e.key.toLowerCase()) {
            case ' ':
            case 'k':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'arrowleft':
                e.preventDefault();
                rewind();
                break;
            case 'arrowright':
                e.preventDefault();
                forward();
                break;
            case 'arrowup':
                e.preventDefault();
                updateVolume(Math.min(1, videoPlayer.volume + 0.1));
                showToast(`Volume: ${Math.round(videoPlayer.volume * 100)}%`, 'info');
                break;
            case 'arrowdown':
                e.preventDefault();
                updateVolume(Math.max(0, videoPlayer.volume - 0.1));
                showToast(`Volume: ${Math.round(videoPlayer.volume * 100)}%`, 'info');
                break;
            case 'm':
                toggleMute();
                showToast(videoPlayer.volume > 0 ? 'Unmuted' : 'Muted', 'info');
                break;
            case 'f':
                toggleFullscreen();
                break;
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                const percent = parseInt(e.key) * 10;
                videoPlayer.currentTime = (percent / 100) * videoPlayer.duration;
                showToast(`Jumped to ${percent}%`, 'info');
                break;
            case '<':
            case ',':
                videoPlayer.playbackRate = Math.max(0.25, videoPlayer.playbackRate - 0.25);
                speedSelector.value = videoPlayer.playbackRate;
                showToast(`Speed: ${videoPlayer.playbackRate}x`, 'info');
                break;
            case '>':
            case '.':
                videoPlayer.playbackRate = Math.min(2, videoPlayer.playbackRate + 0.25);
                speedSelector.value = videoPlayer.playbackRate;
                showToast(`Speed: ${videoPlayer.playbackRate}x`, 'info');
                break;
        }
    });

    // ==================== TOAST NOTIFICATIONS ====================
    function showToast(message, type = 'info') {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ==================== DOUBLE CLICK FOR FULLSCREEN ====================
    let lastClickTime = 0;
    videoWrapper.addEventListener('click', (e) => {
        const currentTime = new Date().getTime();
        const timeDiff = currentTime - lastClickTime;
        
        if (timeDiff < 300) {
            toggleFullscreen();
        }
        
        lastClickTime = currentTime;
    });

    // ==================== VIDEO ERROR HANDLING ====================
    videoPlayer.addEventListener('error', (e) => {
        showToast('Error loading video', 'error');
        console.error('Video Error:', e);
    });

    // ==================== INITIAL SETUP ====================
    // Set initial volume
    updateVolume(1);
    
    // Welcome message
    console.log('%c🚀 StreamUltra Loaded!', 'color: #667eea; font-size: 20px; font-weight: bold;');
    console.log('Keyboard shortcuts enabled. Press ? for help.');
    
    // Load a sample video for demonstration
    // Uncomment the line below to load a demo video
    // loadVideo('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
});

// ==================== UTILITY FUNCTIONS ====================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}