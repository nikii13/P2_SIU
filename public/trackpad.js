const socket = io();

const trackpadScreen = document.getElementById("trackpad-screen");
const trackpadDot = document.getElementById("trackpad-dot");

let lastTwoFingerY = null;

function getNormalizedPosition(clientX, clientY) {
  const rect = trackpadScreen.getBoundingClientRect();

  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const xRatio = Math.max(0, Math.min(1, x / rect.width));
  const yRatio = Math.max(0, Math.min(1, y / rect.height));

  return { xRatio, yRatio };
}

function showDot(clientX, clientY) {
  const { xRatio, yRatio } = getNormalizedPosition(clientX, clientY);

  trackpadDot.style.left = `${xRatio * 100}%`;
  trackpadDot.style.top = `${yRatio * 100}%`;
  trackpadDot.classList.add("active");
}

trackpadScreen.addEventListener("touchstart", (event) => {
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    const { xRatio, yRatio } = getNormalizedPosition(touch.clientX, touch.clientY);

    showDot(touch.clientX, touch.clientY);

    socket.emit("cursor:update", { xRatio, yRatio });
  }

  if (event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    lastTwoFingerY = (touch1.clientY + touch2.clientY) / 2;
    trackpadDot.classList.remove("active");
  }
}, { passive: true });

trackpadScreen.addEventListener("touchmove", (event) => {
  // 1 dedo = mover cursor
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    const { xRatio, yRatio } = getNormalizedPosition(touch.clientX, touch.clientY);

    showDot(touch.clientX, touch.clientY);

    socket.emit("cursor:update", { xRatio, yRatio });
  }

  // 2 dedos = scroll
  if (event.touches.length === 2) {
    const touch1 = event.touches[0];
    const touch2 = event.touches[1];
    const avgY = (touch1.clientY + touch2.clientY) / 2;

    if (typeof lastTwoFingerY === "number") {
      const deltaY = avgY - lastTwoFingerY;
      socket.emit("cursor:scroll", { deltaY });
    }

    lastTwoFingerY = avgY;
    trackpadDot.classList.remove("active");
  }
}, { passive: true });

trackpadScreen.addEventListener("touchend", () => {
  lastTwoFingerY = null;
  trackpadDot.classList.remove("active");
  socket.emit("cursor:hide");
});

trackpadScreen.addEventListener("touchcancel", () => {
  lastTwoFingerY = null;
  trackpadDot.classList.remove("active");
  socket.emit("cursor:hide");
});