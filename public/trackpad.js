const socket = io();

const trackpadScreen = document.getElementById("trackpad-screen");
const trackpadDot = document.getElementById("trackpad-dot");

let lastTwoFingerY = null;
let activeTouchIds = new Set();
let lockReleaseTimer = null;
const LOCK_IDLE_TIMEOUT_MS = 5000;
let activePointerId = null;
let lastPointerY = null;

function setLockReleaseTimer() {
  if (lockReleaseTimer) clearTimeout(lockReleaseTimer);
  lockReleaseTimer = setTimeout(() => {
    activeTouchIds = new Set();
    activePointerId = null;
    lastTwoFingerY = null;
    lastPointerY = null;
    trackpadDot.classList.remove("active");
    socket.emit("cursor:hide");
  }, LOCK_IDLE_TIMEOUT_MS);
}

function isEventFromActiveTouch(event) {
  if (activeTouchIds.size === 0) return true;
  const present = new Set(Array.from(event.touches).map((t) => t.identifier));
  for (const id of activeTouchIds) {
    if (!present.has(id)) return false;
  }
  return true;
}

function claimTouchLock(event) {
  if (activeTouchIds.size > 0) return;
  if (event.touches.length === 1) {
    activeTouchIds = new Set([event.touches[0].identifier]);
  } else if (event.touches.length === 2) {
    activeTouchIds = new Set([event.touches[0].identifier, event.touches[1].identifier]);
  } else {
    return;
  }
  setLockReleaseTimer();
}

function releaseTouchIds(changedTouches) {
  if (activeTouchIds.size === 0) return;
  for (const t of changedTouches) activeTouchIds.delete(t.identifier);
  if (activeTouchIds.size === 0) {
    if (lockReleaseTimer) clearTimeout(lockReleaseTimer);
    lockReleaseTimer = null;
  }
}

function claimPointerLock(event) {
  if (activePointerId !== null || activeTouchIds.size > 0) return false;
  activePointerId = event.pointerId;
  setLockReleaseTimer();
  return true;
}

function isEventFromActivePointer(event) {
  if (activePointerId === null) return true;
  return event.pointerId === activePointerId;
}

function releasePointerLock(event) {
  if (activePointerId === null) return;
  if (event.pointerId !== activePointerId) return;
  activePointerId = null;
  lastPointerY = null;
  if (lockReleaseTimer) clearTimeout(lockReleaseTimer);
  lockReleaseTimer = null;
}

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
  claimTouchLock(event);
  if (!isEventFromActiveTouch(event)) return;
  setLockReleaseTimer();

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
  if (!isEventFromActiveTouch(event)) return;
  setLockReleaseTimer();

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

trackpadScreen.addEventListener("touchend", (event) => {
  releaseTouchIds(event.changedTouches);
  lastTwoFingerY = null;
  trackpadDot.classList.remove("active");
  socket.emit("cursor:hide");
});

trackpadScreen.addEventListener("touchcancel", (event) => {
  releaseTouchIds(event.changedTouches);
  lastTwoFingerY = null;
  trackpadDot.classList.remove("active");
  socket.emit("cursor:hide");
});

// Pointer/mouse support for non-touch laptops (ignore touch pointers — phones/tablets use touch* handlers only)
trackpadScreen.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") return;

  // Only start if nothing else owns the pad
  claimPointerLock(event);
  if (!isEventFromActivePointer(event)) return;
  if (activeTouchIds.size > 0) return;

  // Capture pointer so dragging keeps working off-element
  if (trackpadScreen.setPointerCapture) {
    try { trackpadScreen.setPointerCapture(event.pointerId); } catch {}
  }

  setLockReleaseTimer();

  if (event.shiftKey) {
    // Shift + drag = scroll
    lastPointerY = event.clientY;
    trackpadDot.classList.remove("active");
    return;
  }

  const { xRatio, yRatio } = getNormalizedPosition(event.clientX, event.clientY);
  showDot(event.clientX, event.clientY);
  socket.emit("cursor:update", { xRatio, yRatio });
});

trackpadScreen.addEventListener("pointermove", (event) => {
  if (event.pointerType === "touch") return;
  if (!isEventFromActivePointer(event)) return;
  if (activePointerId === null) return;
  if (activeTouchIds.size > 0) return;

  setLockReleaseTimer();

  if (event.shiftKey) {
    if (typeof lastPointerY === "number") {
      const deltaY = event.clientY - lastPointerY;
      socket.emit("cursor:scroll", { deltaY });
    }
    lastPointerY = event.clientY;
    trackpadDot.classList.remove("active");
    return;
  }

  const { xRatio, yRatio } = getNormalizedPosition(event.clientX, event.clientY);
  showDot(event.clientX, event.clientY);
  socket.emit("cursor:update", { xRatio, yRatio });
});

trackpadScreen.addEventListener("pointerup", (event) => {
  if (event.pointerType === "touch") return;
  if (!isEventFromActivePointer(event)) return;
  releasePointerLock(event);
  trackpadDot.classList.remove("active");
  socket.emit("cursor:hide");
});

trackpadScreen.addEventListener("pointercancel", (event) => {
  if (event.pointerType === "touch") return;
  if (!isEventFromActivePointer(event)) return;
  releasePointerLock(event);
  trackpadDot.classList.remove("active");
  socket.emit("cursor:hide");
});