// Audio Context and Elements
let audioContext;
let analyser;
let microphone;
let audioSource;
let isPlaying = false;
let animationId;
let currentVisualization = 'bars';
let primaryColor = '#ff4d4d';

// DOM Elements
const startBtn = document.getElementById('start-btn');
const audioSourceSelect = document.getElementById('audio-source');
const audioUpload = document.getElementById('audio-upload');
const visualModeSelect = document.getElementById('visual-mode');
const colorPicker = document.getElementById('color-picker');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const overlay = document.querySelector('.overlay');

// Initialize
function init() {
    // Set canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Event Listeners
    startBtn.addEventListener('click', toggleAudio);
    audioSourceSelect.addEventListener('change', handleSourceChange);
    audioUpload.addEventListener('change', handleFileUpload);
    visualModeSelect.addEventListener('change', (e) => {
        currentVisualization = e.target.value;
    });
    colorPicker.addEventListener('input', (e) => {
        primaryColor = e.target.value;
        document.documentElement.style.setProperty('--primary-color', primaryColor);
    });

    // Initialize Web Audio API
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
}

function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

// Audio Control Functions
async function toggleAudio() {
    if (isPlaying) {
        stopAudio();
    } else {
        await startAudio();
    }
}

async function startAudio() {
    try {
        if (audioSourceSelect.value === 'mic') {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            microphone = audioContext.createMediaStreamSource(stream);
            audioSource = microphone;
        } else {
            if (!audioUpload.files[0]) {
                alert('Please select an audio file first');
                return;
            }
            const file = audioUpload.files[0];
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.loop = true;
            source.start();
            audioSource = source;
        }

        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);

        isPlaying = true;
        startBtn.textContent = 'Stop Visualizer';
        overlay.classList.add('hidden');
        visualize();
    } catch (error) {
        console.error('Error starting audio:', error);
        alert('Error accessing audio. Please make sure you have granted microphone permissions.');
    }
}

function stopAudio() {
    if (microphone) {
        microphone.mediaStream.getTracks().forEach(track => track.stop());
        microphone.disconnect();
    }
    if (audioSource && audioSource.stop) {
        audioSource.stop();
    }
    
    cancelAnimationFrame(animationId);
    isPlaying = false;
    startBtn.textContent = 'Start Visualizer';
    overlay.classList.remove('hidden');
    clearCanvas();
}

function handleSourceChange() {
    if (audioSourceSelect.value === 'file') {
        audioUpload.style.display = 'block';
    } else {
        audioUpload.style.display = 'none';
    }
}

function handleFileUpload() {
    if (isPlaying) {
        stopAudio();
    }
}

// Visualization Functions
function visualize() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
        animationId = requestAnimationFrame(draw);
        
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        switch (currentVisualization) {
            case 'bars':
                drawBars(dataArray, bufferLength);
                break;
            case 'wave':
                drawWave(dataArray, bufferLength);
                break;
            case 'particles':
                drawParticles(dataArray, bufferLength);
                break;
        }
    };
    
    draw();
}

function drawBars(dataArray, bufferLength) {
    const barWidth = canvas.width / bufferLength * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 255 * canvas.height;
        
        ctx.fillStyle = primaryColor;
        ctx.fillRect(
            x, 
            canvas.height - barHeight, 
            barWidth, 
            barHeight
        );
        
        x += barWidth + 1;
    }
}

function drawWave(dataArray, bufferLength) {
    ctx.beginPath();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    
    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255;
        const y = v * canvas.height;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    ctx.stroke();
}

function drawParticles(dataArray, bufferLength) {
    const particles = [];
    const particleCount = 100;
    
    // Create particles if needed
    if (window.particles && window.particles.length === particleCount) {
        particles = window.particles;
    } else {
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 5 + 2,
                speedX: Math.random() * 2 - 1,
                speedY: Math.random() * 2 - 1,
                baseX: 0,
                baseY: 0
            });
        }
        window.particles = particles;
    }
    
    // Update particles based on audio data
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const audioValue = dataArray[i % bufferLength] / 255;
        
        p.baseX = p.x;
        p.baseY = p.y;
        
        p.x += p.speedX;
        p.y += p.speedY;
        
        // Bounce off edges
        if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
        if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + audioValue), 0, Math.PI * 2);
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.7;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Initialize the app
window.addEventListener('load', init);
