const socket = io();

const videoEl = document.getElementById("camera-feed");
const canvasEl = document.getElementById("hand-canvas");
const canvasCtx = canvasEl.getContext("2d");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const arrowEl = document.getElementById("gesture-arrow");

// --- Gesture tracking state ---
const SCROLL_AMOUNT = 120;
const EMIT_INTERVAL_MS = 60;
const DIRECTION_THRESHOLD = 0.06; // min y-distance between tip and MCP to count

let lastEmitTime = 0;
let arrowTimeout = null;
let currentDirection = null; // "up" | "down" | null
let directionHoldCount = 0;
const HOLD_FRAMES_REQUIRED = 3; // frames before we act (debounce)

// --- Status helpers ---
function setStatus(state, text) {
  statusText.textContent = text;
  statusDot.className = "status-dot " + state;
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

  if (!indexIsExtended || !middleCurled || !ringCurled || !pinkyCurled) {
    return null;
  }

  // In screen/camera coords y increases downward.
  // Tip above MCP → tip.y < mcp.y → pointing up
  const dy = indexTip.y - indexMcp.y;

  if (dy < -DIRECTION_THRESHOLD) return "up";
  if (dy > DIRECTION_THRESHOLD) return "down";
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

// --- Camera startup ---
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
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
    setStatus("error", "Error: no se pudo acceder a la cámara");
    console.error("Camera access error:", err);
  }
}

startCamera();
