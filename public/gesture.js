(function(_parentSocket) {
const socket = _parentSocket || io();

const videoEl = document.getElementById("camera-feed");
const canvasEl = document.getElementById("hand-canvas");
if (!canvasEl) return;
const canvasCtx = canvasEl.getContext("2d");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const arrowEl = document.getElementById("gesture-arrow");
const startBtn = document.getElementById("gesture-start-btn");
const debugEl = document.getElementById("gesture-debug");
let cameraStartInProgress = false;

const SCROLL_AMOUNT = 120;
const EMIT_INTERVAL_MS = 60;
// Up was too strict in practice; use slightly lower threshold + a bit of hysteresis.
const UP_THRESHOLD = 0.035;
const DOWN_THRESHOLD = 0.045;
const VERTICALITY_RATIO = 0.55; // require mostly-vertical pointing

let lastEmitTime = 0;
let arrowTimeout = null;
let currentDirection = null;
let directionHoldCount = 0;
const HOLD_FRAMES_REQUIRED = 3;

// --- Status helpers ---
function setStatus(state, text) {
  statusText.textContent = text;
  statusDot.className = "status-dot " + state;
}

function setDebug(lines) {
  if (!debugEl) return;
  debugEl.classList.remove("hidden");
  debugEl.textContent = Array.isArray(lines) ? lines.join("\n") : String(lines || "");
}

function showArrow(direction) {
  arrowEl.className = "gesture-arrow visible " + direction;
  clearTimeout(arrowTimeout);
  arrowTimeout = setTimeout(() => {
    arrowEl.className = "gesture-arrow";
  }, 400);
}

// --- Hand landmark drawing ---
function drawLandmarks(landmarks) {
  canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  // Draw connections
  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],[0,17]
  ];

  canvasCtx.strokeStyle = "rgba(122, 162, 255, 0.6)";
  canvasCtx.lineWidth = 2;
  connections.forEach(([a, b]) => {
    const from = landmarks[a];
    const to = landmarks[b];
    canvasCtx.beginPath();
    canvasCtx.moveTo(from.x * canvasEl.width, from.y * canvasEl.height);
    canvasCtx.lineTo(to.x * canvasEl.width, to.y * canvasEl.height);
    canvasCtx.stroke();
  });

  // Draw joints
  landmarks.forEach((lm) => {
    const x = lm.x * canvasEl.width;
    const y = lm.y * canvasEl.height;
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 4, 0, 2 * Math.PI);
    canvasCtx.fillStyle = "#7aa2ff";
    canvasCtx.fill();
  });

  // Highlight wrist
  const wrist = landmarks[0];
  canvasCtx.beginPath();
  canvasCtx.arc(wrist.x * canvasEl.width, wrist.y * canvasEl.height, 8, 0, 2 * Math.PI);
  canvasCtx.fillStyle = "#ff4d6d";
  canvasCtx.fill();
}

// --- Finger state helpers ---
function fingerExtended(tip, pip, mcp) {
  // Extended if tip is farther from MCP than PIP is (along any axis)
  const tipDist = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
  const pipDist = Math.hypot(pip.x - mcp.x, pip.y - mcp.y);
  return tipDist > pipDist * 1.05;
}

function detectPointingDirection(landmarks) {
  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const indexMcp = landmarks[5];

  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const middleMcp = landmarks[9];

  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const ringMcp = landmarks[13];

  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];
  const pinkyMcp = landmarks[17];

  const indexIsExtended = fingerExtended(indexTip, indexPip, indexMcp);
  const middleCurled = !fingerExtended(middleTip, middlePip, middleMcp);
  const ringCurled = !fingerExtended(ringTip, ringPip, ringMcp);
  const pinkyCurled = !fingerExtended(pinkyTip, pinkyPip, pinkyMcp);

  // On many cameras/angles, people naturally "open" their hand a bit when pointing up.
  // Keep a curled check but allow one finger to be not-curled.
  const curledCount = Number(middleCurled) + Number(ringCurled) + Number(pinkyCurled);
  if (!indexIsExtended || curledCount < 2) {
    return null;
  }

  // In screen/camera coords y increases downward.
  // Tip above MCP → tip.y < mcp.y → pointing up
  const dx = indexTip.x - indexMcp.x;
  const dy = indexTip.y - indexMcp.y;

  // Require the pointing vector to be mostly vertical; prevents sideways gestures from firing.
  if (Math.abs(dy) < Math.abs(dx) * VERTICALITY_RATIO) return null;

  if (dy < -UP_THRESHOLD) return "up";
  if (dy > DOWN_THRESHOLD) return "down";
  return null;
}

// --- Gesture detection ---
function processGesture(landmarks) {
  const detected = detectPointingDirection(landmarks);

  if (detected === currentDirection && detected !== null) {
    directionHoldCount++;
  } else if (detected !== currentDirection) {
    currentDirection = detected;
    directionHoldCount = detected ? 1 : 0;
  }

  if (currentDirection === null || directionHoldCount < HOLD_FRAMES_REQUIRED) {
    return;
  }

  const now = Date.now();
  if (now - lastEmitTime < EMIT_INTERVAL_MS) return;
  lastEmitTime = now;

  const deltaY = currentDirection === "down" ? SCROLL_AMOUNT : -SCROLL_AMOUNT;
  socket.emit("cursor:scroll", { deltaY });

  showArrow(currentDirection);
  setStatus(
    "active",
    currentDirection === "up" ? "Scroll hacia arriba ☝️" : "Scroll hacia abajo 👇"
  );
}

// --- MediaPipe setup ---
function onResults(results) {
  canvasEl.width = videoEl.videoWidth;
  canvasEl.height = videoEl.videoHeight;

  canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    drawLandmarks(landmarks);
    processGesture(landmarks);
    if (statusDot.className.indexOf("active") === -1) {
      setStatus("tracking", "Mano detectada");
    }
  } else {
    currentDirection = null;
    directionHoldCount = 0;
    setStatus("waiting", "Buscando mano...");
  }
}

function setStartEnabled(enabled) {
  if (!startBtn) return;
  startBtn.disabled = !enabled;
  startBtn.style.display = "inline-flex";
  startBtn.textContent = enabled ? "Activar cámara" : "Activando...";
}

function createHandsOrNull() {
  if (typeof Hands === "undefined") return null;
  const hands = new Hands({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });

  hands.onResults(onResults);
  return hands;
}

const hands = createHandsOrNull();

function isLikelySecureForCamera() {
  // getUserMedia() for video is only allowed in secure contexts (HTTPS),
  // with common dev exceptions for localhost/127.0.0.1.
  if (window.isSecureContext) return true;
  return location.hostname === "localhost" || location.hostname === "127.0.0.1";
}

// --- Camera startup ---
async function startCamera() {
  if (cameraStartInProgress) return;
  try {
    if (!videoEl || !canvasEl || !statusDot || !statusText || !arrowEl) {
      return;
    }

    if (!hands) {
      setStatus("error", "Error: MediaPipe no cargó");
      setStartEnabled(false);
      setDebug([
        `hostname=${location.hostname}`,
        `secureContext=${String(window.isSecureContext)}`,
        `Hands=${typeof Hands}`,
      ]);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("error", "Error: navegador sin acceso a cámara");
      setStartEnabled(false);
      setDebug([
        `hostname=${location.hostname}`,
        `secureContext=${String(window.isSecureContext)}`,
        `mediaDevices=${String(!!navigator.mediaDevices)}`,
        `getUserMedia=${String(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia))}`,
      ]);
      return;
    }

    // getUserMedia requires secure context except localhost.
    if (!isLikelySecureForCamera()) {
      setStatus("error", "La cámara requiere HTTPS (o abrir en localhost).");
      setStartEnabled(true);
      setDebug([
        `Blocked by insecure context`,
        `url=${location.href}`,
        `hostname=${location.hostname}`,
        `secureContext=${String(window.isSecureContext)}`,
      ]);
      return;
    }

    cameraStartInProgress = true;
    setStartEnabled(false);
    setStatus("waiting", "Solicitando permiso de cámara...");
    setDebug([
      `url=${location.href}`,
      `hostname=${location.hostname}`,
      `secureContext=${String(window.isSecureContext)}`,
      `userAgent=${navigator.userAgent}`,
    ]);
    // Ensure iOS Safari reliably renders the stream.
    videoEl.playsInline = true;
    videoEl.muted = true;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: 640, height: 480 },
    });
    videoEl.srcObject = stream;
    await videoEl.play();

    setStatus("waiting", "Buscando mano...");

    // Feed frames to MediaPipe
    async function sendFrame() {
      if (videoEl.readyState >= 2) {
        await hands.send({ image: videoEl });
      }
      requestAnimationFrame(sendFrame);
    }
    sendFrame();
  } catch (err) {
    const name = err && err.name ? err.name : "";
    const message = err && err.message ? err.message : "";

    if (name === "SecurityError") {
      setStatus("error", "Bloqueado por seguridad: usa HTTPS o localhost.");
      setStartEnabled(true);
      setDebug([
        `name=${name}`,
        `message=${message}`,
        `url=${location.href}`,
        `secureContext=${String(window.isSecureContext)}`,
      ]);
      return;
    }

    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      setStatus("error", "Permiso denegado. Pulsa \"Activar camara\".");
      setStartEnabled(true);
      setDebug([`name=${name}`, `message=${message}`]);
      return;
    }

    if (name === "NotReadableError" || name === "TrackStartError") {
      setStatus("error", "La cámara está en uso. Cierra otras apps y reintenta.");
      setStartEnabled(true);
      setDebug([`name=${name}`, `message=${message}`]);
      return;
    }

    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      setStatus("error", "No se encontró cámara en el dispositivo.");
      setStartEnabled(false);
      setDebug([`name=${name}`, `message=${message}`]);
      return;
    }

    setStatus("error", "Error: no se pudo acceder a la cámara");
    setStartEnabled(true);
    setDebug([`name=${name || "UnknownError"}`, `message=${message}`]);
    console.error("Camera access error:", err);
  } finally {
    cameraStartInProgress = false;
  }
}

setStartEnabled(!!startBtn);
if (statusDot && statusText) {
  setStatus("waiting", "Pulsa \"Activar camara\" para comenzar");
}
if (startBtn) {
  startBtn.addEventListener("click", () => startCamera());
}

if (!isLikelySecureForCamera()) {
  setStatus("error", "La cámara requiere HTTPS (no funciona en HTTP en el móvil).");
  setStartEnabled(true);
  setDebug([
    `url=${location.href}`,
    `hostname=${location.hostname}`,
    `secureContext=${String(window.isSecureContext)}`,
  ]);
}

})(typeof socket !== 'undefined' ? socket : null);
