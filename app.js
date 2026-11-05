const video = document.getElementById('webcam');
const cameraSelect = document.getElementById('cameraSelect');
const filterSelect = document.getElementById('filterSelect');
const modeSelect = document.getElementById('modeSelect');
const timerSelect = document.getElementById('timerSelect');
const chkMirror = document.getElementById('chkMirror');

const btnToggleCam = document.getElementById('btnToggleCam');
const btnCapture = document.getElementById('btnCapture');
const btnDownload = document.getElementById('btnDownload');
const btnInstall = document.getElementById('btnInstall');

const countdownOverlay = document.getElementById('countdownOverlay');
const flashOverlay = document.getElementById('flashOverlay');
const statusMsg = document.getElementById('statusMsg');
const resultSection = document.getElementById('resultSection');
const frameStyleControls = document.getElementById('frameStyleControls');
const resultImage = document.getElementById('resultImage');
const renderCanvas = document.getElementById('renderCanvas');

let currentStream = null;
let isStreaming = false;
let deferredPrompt = null;

let capturedPhotos = [];
let selectedFrameColor = '#ffffff';

// Check browser support
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  showError("Browser tidak mendukung kamera atau diakses tanpa HTTPS.");
}

function showError(msg) {
  statusMsg.textContent = msg;
  statusMsg.className = "status-msg error";
}

function clearError() {
  statusMsg.textContent = "";
  statusMsg.className = "status-msg";
}

// Camera devices enumeration
async function getCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');

    cameraSelect.innerHTML = '';
    if (videoDevices.length === 0) {
      showError("Kamera tidak ditemukan.");
      return;
    }

    videoDevices.forEach((device, idx) => {
      const opt = document.createElement('option');
      opt.value = device.deviceId;
      opt.textContent = device.label || `Kamera ${idx + 1}`;
      cameraSelect.appendChild(opt);
    });

    cameraSelect.disabled = false;
  } catch (err) {
    showError("Gagal membaca daftar kamera: " + err.message);
  }
}

// Start Stream
async function startCamera(deviceId = null) {
  stopCamera();

  const constraints = {
    video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                    : { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = currentStream;
    isStreaming = true;

    btnToggleCam.textContent = "Matikan Kamera";
    btnToggleCam.classList.add('stop');
    btnCapture.disabled = false;
    clearError();

    await getCameras();
    if (deviceId) cameraSelect.value = deviceId;
  } catch (err) {
    isStreaming = false;
    btnToggleCam.textContent = "Nyalakan Kamera";
    btnToggleCam.classList.remove('stop');
    btnCapture.disabled = true;

    if (err.name === 'NotAllowedError') {
      showError("Izin kamera ditolak. Izinkan akses di gembok browser Anda.");
    } else if (err.name === 'NotReadableError') {
      showError("Kamera terpakai oleh aplikasi lain (Zoom, OBS, dll).");
    } else {
      showError("Gagal membuka kamera: " + err.message);
    }
  }
}

// Stop Stream
function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
  video.srcObject = null;
  isStreaming = false;
  btnToggleCam.textContent = "Nyalakan Kamera";
  btnToggleCam.classList.remove('stop');
  btnCapture.disabled = true;
}

// Mirroring & Filter Live Update
chkMirror.addEventListener('change', () => {
  if (chkMirror.checked) {
    video.classList.add('mirror');
  } else {
    video.classList.remove('mirror');
  }
});

filterSelect.addEventListener('change', () => {
  video.style.filter = filterSelect.value;
});

// Countdown Helper
function runCountdown(seconds) {
  return new Promise((resolve) => {
    if (seconds <= 0) return resolve();
    
    let count = seconds;
    countdownOverlay.style.display = 'flex';
    countdownOverlay.textContent = count;

    const timer = setInterval(() => {
      count--;
      if (count > 0) {
        countdownOverlay.textContent = count;
      } else {
        clearInterval(timer);
        countdownOverlay.style.display = 'none';
        resolve();
      }
    }, 1000);
  });
}

// Flash Effect
function triggerFlash() {
  flashOverlay.classList.add('active');
  setTimeout(() => flashOverlay.classList.remove('active'), 200);
}

// Single Shot Frame Grab
function grabFrame() {
  const ctx = renderCanvas.getContext('2d');
  const w = video.videoWidth;
  const h = video.videoHeight;
  renderCanvas.width = w;
  renderCanvas.height = h;

  ctx.save();

  // Apply Mirror if needed
  if (chkMirror.checked) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }

  // Apply Filter
  if (filterSelect.value !== 'none') {
    ctx.filter = filterSelect.value;
  }

  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();

  return renderCanvas.toDataURL('image/png');
}

// Capture Logic
btnCapture.addEventListener('click', async () => {
  if (!isStreaming) return;
  btnCapture.disabled = true;
  capturedPhotos = [];

  const timerSecs = parseInt(timerSelect.value, 10);
  const mode = modeSelect.value;

  if (mode === 'single') {
    await runCountdown(timerSecs);
    triggerFlash();
    const dataUrl = grabFrame();
    capturedPhotos.push(dataUrl);
    renderSingleResult(dataUrl);
  } else if (mode === 'strip4') {
    for (let i = 1; i <= 4; i++) {
      showError(`Mengambil foto ${i} dari 4...`);
      await runCountdown(timerSecs);
      triggerFlash();
      const dataUrl = grabFrame();
      capturedPhotos.push(dataUrl);
      await new Promise(r => setTimeout(r, 600)); // Jedah singkat antar foto
    }
    clearError();
    renderStripResult();
  }

  btnCapture.disabled = false;
});

// Render Single Photo Output
function renderSingleResult(dataUrl) {
  frameStyleControls.style.display = 'none';
  resultImage.src = dataUrl;
  resultSection.style.display = 'block';
  resultSection.scrollIntoView({ behavior: 'smooth' });
}

// Render 4-Cut Photobooth Strip
function renderStripResult() {
  frameStyleControls.style.display = 'flex';

  const ctx = renderCanvas.getContext('2d');
  
  // Dimensions for Photobooth Strip (Single Column 4 Shots)
  const photoW = 600;
  const photoH = 450; // 4:3 Aspect ratio
  const padding = 30;
  const gap = 20;
  const footerH = 100;

  const stripW = photoW + (padding * 2);
  const stripH = padding + (photoH * 4) + (gap * 3) + footerH;

  renderCanvas.width = stripW;
  renderCanvas.height = stripH;

  // Draw Background Frame
  ctx.fillStyle = selectedFrameColor;
  ctx.fillRect(0, 0, stripW, stripH);

  let loadedCount = 0;
  capturedPhotos.forEach((src, idx) => {
    const img = new Image();
    img.onload = () => {
      const yPos = padding + idx * (photoH + gap);
      ctx.drawImage(img, padding, yPos, photoW, photoH);
      loadedCount++;

      if (loadedCount === 4) {
        // Draw Footer Text
        ctx.fillStyle = (selectedFrameColor === '#ffffff' || selectedFrameColor === '#fbcfe8' || selectedFrameColor === '#bae6fd' || selectedFrameColor === '#fef08a') ? '#0f172a' : '#ffffff';
        ctx.font = 'bold 24px system-ui, sans-serif';
        ctx.textAlign = 'center';
        
        const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        ctx.fillText('PHOTOBOOTH PWA', stripW / 2, stripH - 45);
        
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText(dateStr, stripW / 2, stripH - 22);

        resultImage.src = renderCanvas.toDataURL('image/png');
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });
      }
    };
    img.src = src;
  });
}

// Change Frame Color
document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedFrameColor = e.target.getAttribute('data-color');
    if (capturedPhotos.length === 4) {
      renderStripResult();
    }
  });
});

// Download Action
btnDownload.addEventListener('click', () => {
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.download = `photobooth-${timestamp}.png`;
  link.href = resultImage.src;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Event Listeners for controls
btnToggleCam.addEventListener('click', () => {
  if (isStreaming) stopCamera();
  else startCamera(cameraSelect.value);
});

cameraSelect.addEventListener('change', () => {
  if (isStreaming) startCamera(cameraSelect.value);
});

// PWA Install Prompt Listener
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  btnInstall.style.display = 'block';
});

btnInstall.addEventListener('click', async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      btnInstall.style.display = 'none';
    }
    deferredPrompt = null;
  }
});

getCameras();
