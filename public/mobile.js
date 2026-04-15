const socket = io();
const container = document.getElementById("mobile-machines-container");
const filterSelect = document.getElementById("filter");
const feedbackMessage = document.getElementById("feedback-message");

const headerLogin = document.getElementById("header-login");
const headerUser = document.getElementById("header-user");
const usernameDisplay = document.getElementById("username-display");
const logoutBtn = document.getElementById("logout-btn");

const loginBtn = document.getElementById("login-btn");
const usernameInput = document.getElementById("username-input");
const trackpadNavBtn = document.getElementById("trackpad-nav-btn");
const trackpadNavBtn2 = document.getElementById("trackpad-nav-btn-2");
const trackpadFab = document.getElementById("trackpad-fab");
const gestureFab = document.getElementById("gesture-fab");
const gesturePanel = document.getElementById("gesture-panel");

let username = null;
let allMachines = [];
let selectedMachineId = null;
let selectedDurations = {};

const USERNAME_STORAGE_KEY = "gym_username";

function goToTrackpad() {
  window.location.href = "/trackpad";
}

if (trackpadNavBtn) trackpadNavBtn.addEventListener("click", goToTrackpad);
if (trackpadNavBtn2) trackpadNavBtn2.addEventListener("click", goToTrackpad);
if (trackpadFab) trackpadFab.addEventListener("click", goToTrackpad);

function toggleGesturesPanel() {
  if (!gesturePanel) return;
  gesturePanel.classList.toggle("hidden");
}

if (gestureFab) gestureFab.addEventListener("click", toggleGesturesPanel);

function setLoggedInUser(nextUsername) {
  username = nextUsername;
  if (username) {
    socket.emit("user:login", username);
    headerLogin.classList.add("hidden");
    headerUser.classList.remove("hidden");
    usernameDisplay.textContent = username;
    try {
      localStorage.setItem(USERNAME_STORAGE_KEY, username);
    } catch (_) {}
  } else {
    socket.emit("user:logout");
    headerUser.classList.add("hidden");
    headerLogin.classList.remove("hidden");
    usernameDisplay.textContent = "";
    try {
      localStorage.removeItem(USERNAME_STORAGE_KEY);
    } catch (_) {}
  }
}

loginBtn.addEventListener("click", () => {
  const value = usernameInput.value.trim();

  if (!value) {
    showFeedback("Introduce un nombre");
    return;
  }

  setLoggedInUser(value);

  showFeedback(`Bienvenido ${username}`);
});

logoutBtn.addEventListener("click", () => {
  setLoggedInUser(null);
  selectedMachineId = null;

  usernameInput.value = "";

  renderMachines(allMachines);
  showFeedback("Sesión cerrada");
});

function getStatusLabel(status) {
  return status === "free" ? "Libre" : "Ocupada";
}

function getStatusClass(status) {
  return status === "free" ? "status-free" : "status-occupied";
}

function showFeedback(message) {
  if (!feedbackMessage) return;

  feedbackMessage.textContent = message;
  feedbackMessage.classList.remove("hidden");

  setTimeout(() => {
    feedbackMessage.classList.add("hidden");
    feedbackMessage.textContent = "";
  }, 2500);
}

function getSelectedDuration(machineId) {
  return selectedDurations[machineId] || 20;
}

function getQueueInfo(machine) {
  const list = Array.isArray(machine.waitQueue) ? machine.waitQueue : [];
  const length = Number(machine.waitQueueLength) || list.length || 0;
  const pos = username ? list.findIndex((u) => u === username) : -1;
  return { list, length, pos };
}

function renderMachines(machines) {
  if (!container || !filterSelect) return;

  const currentFilter = filterSelect.value;

  const filteredMachines =
    currentFilter === "all"
      ? machines
      : machines.filter((machine) => machine.category === currentFilter);

  container.innerHTML = "";

  if (filteredMachines.length === 0) {
    container.innerHTML = `
      <div class="feedback-message">
        No hay máquinas para este filtro.
      </div>
    `;
    return;
  }

  filteredMachines.forEach((machine) => {
    const card = document.createElement("article");
    const isSelected = machine.id === selectedMachineId;
    const isFree = machine.status === "free";
    const currentDuration = getSelectedDuration(machine.id);
    const queueInfo = getQueueInfo(machine);
    const inQueue = queueInfo.pos >= 0;

    card.className = `machine-card visual-card ${machine.status} ${isSelected ? "selected" : ""}`;

    card.innerHTML = `
      <div class="machine-image-wrap">
        <img src="${machine.image}" alt="${machine.name}" class="machine-image">
        <span class="machine-badge">${machine.subtype}</span>
      </div>

      <div class="machine-content">
        <div class="machine-header-row">
          <div>
            <h3>${machine.name}</h3>
            <p class="machine-meta">${machine.category} · ${machine.zone}</p>
          </div>
          <span class="status-pill ${getStatusClass(machine.status)}">${getStatusLabel(machine.status)}</span>
        </div>

        <div class="machine-details">
          <div class="detail-box">
            <span class="detail-label">Tiempo restante</span>
            <strong>${machine.remainingTime} min</strong>
          </div>
          <div class="detail-box">
            <span class="detail-label">Tipo</span>
            <strong>${machine.subtype}</strong>
          </div>
        </div>

        ${
          machine.reservedBy
            ? `
              <div class="detail-box reserved-by-box">
                <span class="detail-label">Reservada por</span>
                <strong>${machine.reservedBy === username ? "Tú" : machine.reservedBy}</strong>
              </div>
            `
            : ""
        }

        ${
          machine.status === "occupied"
            ? `
              <div class="detail-box reserved-by-box">
                <span class="detail-label">Cola</span>
                <strong>
                  ${queueInfo.length} esperando${inQueue ? ` · Tú: #${queueInfo.pos + 1}` : ""}
                </strong>
              </div>
              <div class="inline-actions">
                <button class="queue-join-btn" data-queue-join-id="${machine.id}" ${!username || inQueue ? "disabled" : ""}>
                  Unirse a la cola
                </button>
                <button class="secondary-button queue-leave-btn" data-queue-leave-id="${machine.id}" ${!username || !inQueue ? "disabled" : ""}>
                  Salir de la cola
                </button>
              </div>
            `
            : ""
        }

        ${
          isSelected
            ? `
              <div class="duration-picker">
                <label for="duration-${machine.id}">Duración de la reserva</label>
                <select class="duration-select" id="duration-${machine.id}" data-duration-id="${machine.id}">
                  <option value="5" ${currentDuration === 5 ? "selected" : ""}>5 min</option>
                  <option value="10" ${currentDuration === 10 ? "selected" : ""}>10 min</option>
                  <option value="15" ${currentDuration === 15 ? "selected" : ""}>15 min</option>
                  <option value="20" ${currentDuration === 20 ? "selected" : ""}>20 min</option>
                  <option value="25" ${currentDuration === 25 ? "selected" : ""}>25 min</option>
                  <option value="30" ${currentDuration === 30 ? "selected" : ""}>30 min</option>
                </select>
              </div>

              <div class="inline-actions">
                <button class="confirm-inline-button" data-confirm-id="${machine.id}" ${!isFree ? "disabled" : ""}>
                  Confirmar reserva
                </button>
                <button class="secondary-button cancel-inline-button" data-cancel-id="${machine.id}">
                  Cancelar
                </button>
              </div>
            `
            : `
              <button data-id="${machine.id}">
                Seleccionar
              </button>
            `
        }
      </div>
    `;

    container.appendChild(card);
  });

  document.querySelectorAll("button[data-queue-join-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!username) {
        showFeedback("Debes iniciar sesión primero");
        return;
      }
      const machineId = Number(button.dataset.queueJoinId);
      socket.emit("machine:queue:join", { machineId });
      showFeedback("Te has unido a la cola.");
    });
  });

  document.querySelectorAll("button[data-queue-leave-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!username) {
        showFeedback("Debes iniciar sesión primero");
        return;
      }
      const machineId = Number(button.dataset.queueLeaveId);
      socket.emit("machine:queue:leave", { machineId });
      showFeedback("Has salido de la cola.");
    });
  });

  document.querySelectorAll("button[data-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const machineId = Number(button.dataset.id);
      selectedMachineId = machineId;
      renderMachines(allMachines);
    });
  });

  document.querySelectorAll("select[data-duration-id]").forEach((select) => {
    select.addEventListener("change", () => {
      const machineId = Number(select.dataset.durationId);
      selectedDurations[machineId] = Number(select.value);
    });
  });

  document.querySelectorAll("button[data-confirm-id]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!username) {
        showFeedback("Debes iniciar sesión primero");
        return;
      }

      const machineId = Number(button.dataset.confirmId);
      const machine = allMachines.find((item) => item.id === machineId);

      if (!machine) {
        showFeedback("No se encontró la máquina.");
        return;
      }

      if (machine.status !== "free") {
        showFeedback("La máquina ya no está disponible.");
        return;
      }

      const duration = getSelectedDuration(machineId);

      socket.emit("machine:reserve", {
        machineId,
        duration
      });

      selectedMachineId = null;
      showFeedback(`Reserva confirmada para ${machine.name} durante ${duration} min.`);
    });
  });

  document.querySelectorAll("button[data-cancel-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMachineId = null;
      renderMachines(allMachines);
      showFeedback("Selección cancelada.");
    });
  });
}

socket.on("machines:update", (machines) => {
  allMachines = machines;

  const selectedMachine = allMachines.find((machine) => machine.id === selectedMachineId);
  if (selectedMachine && selectedMachine.status !== "free") {
    selectedMachineId = null;
  }

  renderMachines(allMachines);
});

socket.on("machine:vacant", ({ machineName, duration }) => {
  const text = `${machineName} está ahora libre. Te la he reservado durante ${duration} minutos.`;
  addVoiceMessage(text, "gym");
  speak(text);
});

if (filterSelect) {
  filterSelect.addEventListener("change", () => {
    selectedMachineId = null;
    renderMachines(allMachines);
  });
}

// Restore login after refresh.
try {
  const saved = localStorage.getItem(USERNAME_STORAGE_KEY);
  if (saved && saved.trim()) {
    setLoggedInUser(saved.trim());
    showFeedback(`Bienvenido ${saved.trim()}`);
  }
} catch (_) {}

// ===== VOICE CONTROL =====

const voiceBtn = document.getElementById("voice-btn");
const voiceChat = document.getElementById("voice-chat");
const voiceLog = document.getElementById("voice-log");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let voiceActive = false;
let voiceState = "WAITING"; // WAITING = listening for wake word, COMMAND = listening for a command
let liveUserEl = null;
let liveGymEl = null;
let isSpeaking = false;
let lastWakeAtMs = 0;
let commandSessionUntilMs = 0;
let commandSessionTimer = null;

const WAKE_DEBOUNCE_MS = 2500;
const COMMAND_SESSION_MS = 12000;

function addVoiceMessage(text, sender) {
  const div = document.createElement("div");
  div.className = "voice-msg " + (sender === "user" ? "voice-user" : "voice-gym");
  div.textContent = (sender === "user" ? "Tú: " : "Gym: ") + text;
  voiceLog.appendChild(div);
  voiceLog.scrollTop = voiceLog.scrollHeight;
  voiceChat.classList.remove("hidden");
}

function ensureLiveUserLine() {
  if (liveUserEl && liveUserEl.isConnected) return liveUserEl;
  liveUserEl = document.createElement("div");
  liveUserEl.className = "voice-msg voice-user voice-live";
  liveUserEl.textContent = "Tú: ";
  voiceLog.appendChild(liveUserEl);
  voiceLog.scrollTop = voiceLog.scrollHeight;
  voiceChat.classList.remove("hidden");
  return liveUserEl;
}

function clearLiveUserLine() {
  if (liveUserEl && liveUserEl.isConnected) liveUserEl.remove();
  liveUserEl = null;
}

function ensureLiveGymLine() {
  if (liveGymEl && liveGymEl.isConnected) return liveGymEl;
  liveGymEl = document.createElement("div");
  liveGymEl.className = "voice-msg voice-gym voice-live";
  liveGymEl.textContent = "Gym: ";
  voiceLog.appendChild(liveGymEl);
  voiceLog.scrollTop = voiceLog.scrollHeight;
  voiceChat.classList.remove("hidden");
  return liveGymEl;
}

function clearLiveGymLine() {
  if (liveGymEl && liveGymEl.isConnected) liveGymEl.remove();
  liveGymEl = null;
}

function openCommandSession() {
  voiceState = "COMMAND";
  commandSessionUntilMs = Date.now() + COMMAND_SESSION_MS;
  voiceBtn.classList.add("voice-listening");
  if (commandSessionTimer) clearInterval(commandSessionTimer);
  commandSessionTimer = setInterval(() => {
    if (!voiceActive) return;
    if (voiceState !== "COMMAND") return;
    if (Date.now() > commandSessionUntilMs) {
      voiceState = "WAITING";
      voiceBtn.classList.remove("voice-listening");
      clearLiveUserLine();
      clearLiveGymLine();
    }
  }, 400);
}

function bumpCommandSession() {
  if (voiceState === "COMMAND") {
    commandSessionUntilMs = Date.now() + COMMAND_SESSION_MS;
  }
}

let cachedSpanishVoice = null;
function pickSpanishVoice() {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices ? synth.getVoices() : [];
  if (!voices.length) return null;
  const esES = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith("es-es"));
  if (esES.length) return esES[0];
  const esAny = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith("es"));
  return esAny[0] || null;
}

function speak(text) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "es-ES";
  if (!cachedSpanishVoice) cachedSpanishVoice = pickSpanishVoice();
  if (cachedSpanishVoice) utter.voice = cachedSpanishVoice;

  // Prevent the assistant's own voice from triggering recognition.
  isSpeaking = true;
  try {
    if (recognition) recognition.abort();
  } catch (_) {}

  const liveEl = ensureLiveGymLine();
  liveEl.textContent = "Gym: ";
  let lastCharIndex = 0;

  utter.onboundary = (e) => {
    if (!liveEl.isConnected) return;
    if (typeof e.charIndex === "number") {
      lastCharIndex = Math.max(lastCharIndex, e.charIndex);
      liveEl.textContent = "Gym: " + text.slice(0, lastCharIndex).trim();
      voiceLog.scrollTop = voiceLog.scrollHeight;
    }
  };

  utter.onend = () => {
    isSpeaking = false;
    if (liveEl.isConnected) {
      liveEl.textContent = "Gym: " + text;
      setTimeout(() => clearLiveGymLine(), 400);
    }
    // Resume recognition shortly after speaking ends.
    if (voiceActive && recognition) {
      setTimeout(() => {
        try {
          recognition.start();
        } catch (_) {}
      }, 250);
    }
  };

  utter.onerror = () => {
    isSpeaking = false;
    setTimeout(() => clearLiveGymLine(), 200);
  };

  synth.speak(utter);
}

function findMachineByVoice(transcript) {
  const lower = transcript.toLowerCase();
  let bestMatch = null;
  let bestLen = 0;

  for (const m of allMachines) {
    const name = m.name.toLowerCase();
    const subtype = m.subtype.toLowerCase();
    if (lower.includes(name) && name.length > bestLen) {
      bestMatch = m;
      bestLen = name.length;
    } else if (lower.includes(subtype) && subtype.length > bestLen) {
      bestMatch = m;
      bestLen = subtype.length;
    }
  }
  return bestMatch;
}

function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function hasWakeWord(lower) {
  const t = normalizeText(lower);
  return (
    t.includes("hola gym") ||
    t.includes("hola jim") ||
    t.includes("ola gym") ||
    t.includes("ola jim")
  );
}

const FILTER_ALIASES = [
  { value: "all", aliases: ["todas", "todo", "toda", "sin filtro", "quitar filtro", "mostrar todo", "mostrar todas"] },
  { value: "Cardio", aliases: ["cardio"] },
  { value: "Tren superior", aliases: ["tren superior", "superior", "fuerza superior"] },
  { value: "Tren inferior", aliases: ["tren inferior", "inferior", "pierna", "piernas"] },
  { value: "Core", aliases: ["core", "abdominales", "abdomen", "abdominal"] },
];

function setCategoryFilterByVoice(transcript) {
  if (!filterSelect) return { ok: false, reason: "no-filter" };
  const t = normalizeText(transcript);

  for (const item of FILTER_ALIASES) {
    if (item.aliases.some((a) => t.includes(a))) {
      filterSelect.value = item.value;
      selectedMachineId = null;
      renderMachines(allMachines);
      const label = item.value === "all" ? "todas" : item.value;
      return { ok: true, label };
    }
  }

  return { ok: false, reason: "no-match" };
}

function handleFinalTranscript(transcript) {
  const lower = transcript.toLowerCase();

  if (voiceState === "WAITING") {
    if (hasWakeWord(lower)) {
      const now = Date.now();
      if (now - lastWakeAtMs < WAKE_DEBOUNCE_MS) return;
      lastWakeAtMs = now;

      addVoiceMessage("Hola Gym", "user");
      const reply = "Sí. ¿En qué puedo ayudarte?";
      addVoiceMessage(reply, "gym");
      speak(reply);
      openCommandSession();
    }
    return;
  }

  if (voiceState === "COMMAND") {
    bumpCommandSession();

    // Ignore wake word repeats while already in command mode.
    if (hasWakeWord(lower)) return;

    addVoiceMessage(transcript, "user");

    const wantsReserve = /\b(reservar|reserva|reservame|resérvame)\b/i.test(transcript);
    const wantsFree = /\b(liberar|libera|dejar libre|deja libre|cancelar|cancela)\b/i.test(transcript);
    const wantsJoinQueue = /(ponme en la cola|unirme a la cola|entrar en la cola|hacer cola|meterme en la cola)/i.test(transcript);
    const wantsLeaveQueue = /(salir de la cola|quitarme de la cola|dejar la cola)/i.test(transcript);
    const wantsHelp = /\b(ayuda|que puedo decir|qué puedo decir)\b/i.test(transcript);
    const wantsFilterList = /(que filtros hay|que filtros tienes|que categorias hay|que categorias tienes)/i.test(transcript);
    const wantsFilter =
      /(filtra|filtrar|filtrar por|mostrar|pon|poner|cambia a|cambiar a|categoria|categoría)/i.test(transcript) ||
      /(cardio|tren superior|tren inferior|core|abdominales|pierna|piernas)/i.test(transcript);

    if (wantsHelp) {
      const reply =
        "Puedes decir: 'reservar' + nombre de máquina, 'liberar' + nombre de máquina, 'ponme en la cola' + nombre de máquina, 'salir de la cola' + nombre de máquina, o 'filtra cardio / tren superior / tren inferior / core'.";
      addVoiceMessage(reply, "gym");
      speak(reply);
      bumpCommandSession();
      return;
    }

    if (wantsFilterList) {
      const reply = "Los filtros disponibles son: todas, cardio, tren superior, tren inferior y core.";
      addVoiceMessage(reply, "gym");
      speak(reply);
      bumpCommandSession();
      return;
    }

    if (wantsFilter && !wantsReserve && !wantsFree && !wantsJoinQueue && !wantsLeaveQueue) {
      const result = setCategoryFilterByVoice(transcript);
      if (result.ok) {
        const reply = `De acuerdo. Mostrando ${result.label}.`;
        addVoiceMessage(reply, "gym");
        speak(reply);
      } else if (result.reason === "no-match") {
        const reply = "No he entendido el filtro. Di: cardio, tren superior, tren inferior, core, o todas.";
        addVoiceMessage(reply, "gym");
        speak(reply);
      }
      bumpCommandSession();
      return;
    }

    if (wantsReserve) {
      if (!username) {
        const reply = "Necesitas iniciar sesión primero.";
        addVoiceMessage(reply, "gym");
        speak(reply);
        bumpCommandSession();
        return;
      }

      const machine = findMachineByVoice(transcript);
      if (!machine) {
        const reply = "Lo siento, no he encontrado esa máquina.";
        addVoiceMessage(reply, "gym");
        speak(reply);
      } else if (machine.status !== "free") {
        const reply = "Lo siento, " + machine.name + " está ocupada ahora mismo.";
        addVoiceMessage(reply, "gym");
        speak(reply);
      } else {
        socket.emit("machine:reserve", { machineId: machine.id, duration: 10 });
        const reply = "Perfecto. " + machine.name + " queda reservada para ti.";
        addVoiceMessage(reply, "gym");
        speak(reply);
      }
      bumpCommandSession();
      return;
    }

    if (wantsFree) {
      if (!username) {
        const reply = "Necesitas iniciar sesión primero.";
        addVoiceMessage(reply, "gym");
        speak(reply);
        bumpCommandSession();
        return;
      }

      const machine = findMachineByVoice(transcript);
      if (!machine) {
        const reply = "Lo siento, no he encontrado esa máquina.";
        addVoiceMessage(reply, "gym");
        speak(reply);
      } else if (machine.status !== "occupied") {
        const reply = machine.name + " ya está libre.";
        addVoiceMessage(reply, "gym");
        speak(reply);
      } else {
        socket.emit("machine:free", { machineId: machine.id });
        const reply = "De acuerdo. " + machine.name + " está ahora libre.";
        addVoiceMessage(reply, "gym");
        speak(reply);
      }
      bumpCommandSession();
      return;
    }

    if (wantsJoinQueue || wantsLeaveQueue) {
      if (!username) {
        const reply = "Necesitas iniciar sesión primero.";
        addVoiceMessage(reply, "gym");
        speak(reply);
        bumpCommandSession();
        return;
      }

      const machine = findMachineByVoice(transcript);
      if (!machine) {
        const reply = "Lo siento, no he encontrado esa máquina.";
        addVoiceMessage(reply, "gym");
        speak(reply);
      } else if (wantsJoinQueue) {
        socket.emit("machine:queue:join", { machineId: machine.id });
        const reply = "Vale. Te he añadido a la cola de " + machine.name + ".";
        addVoiceMessage(reply, "gym");
        speak(reply);
      } else {
        socket.emit("machine:queue:leave", { machineId: machine.id });
        const reply = "Hecho. Te he quitado de la cola de " + machine.name + ".";
        addVoiceMessage(reply, "gym");
        speak(reply);
      }
      bumpCommandSession();
      return;
    }

    const reply =
      "No lo he entendido. Di 'reservar' o 'liberar' seguido del nombre de una máquina, o 'ayuda'.";
    addVoiceMessage(reply, "gym");
    speak(reply);
    bumpCommandSession();
  }
}

function startVoice() {
  if (!SpeechRecognition) {
    showFeedback("Tu navegador no soporta reconocimiento de voz");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "es-ES";

  recognition.onresult = (event) => {
    if (isSpeaking) return;
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const t = res[0]?.transcript || "";
      if (res.isFinal) {
        if (voiceState === "COMMAND") clearLiveUserLine();
        handleFinalTranscript(t.trim());
      } else {
        interim += t;
      }
    }

    const cleaned = interim.trim();
    if (cleaned) {
      const lower = cleaned.toLowerCase();
      if (voiceState === "WAITING" && hasWakeWord(lower)) {
        const now = Date.now();
        if (now - lastWakeAtMs < WAKE_DEBOUNCE_MS) return;
        lastWakeAtMs = now;

        addVoiceMessage("Hola Gym", "user");
        const reply = "Sí. ¿En qué puedo ayudarte?";
        addVoiceMessage(reply, "gym");
        speak(reply);
        openCommandSession();
        return;
      }

      if (voiceState === "COMMAND") {
        const el = ensureLiveUserLine();
        el.textContent = "Tú: " + cleaned;
        bumpCommandSession();
      }
    }
  };

  recognition.onend = () => {
    if (voiceActive) recognition.start();
  };

  recognition.onerror = (e) => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      console.error("Voice error:", e.error);
    }
  };

  recognition.start();
  voiceActive = true;
  voiceBtn.classList.add("voice-active");
  showFeedback('Voz activada — di "Hola Gym" para empezar');
}

function stopVoice() {
  voiceActive = false;
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  voiceState = "WAITING";
  clearLiveUserLine();
  clearLiveGymLine();
  if (commandSessionTimer) {
    clearInterval(commandSessionTimer);
    commandSessionTimer = null;
  }
  voiceBtn.classList.remove("voice-active", "voice-listening");
  voiceChat.classList.add("hidden");
  voiceLog.innerHTML = "";
  showFeedback("Control por voz desactivado");
}

if (voiceBtn) {
  voiceBtn.addEventListener("click", () => {
    if (voiceActive) stopVoice();
    else startVoice();
  });
}

// Don't auto-start voice on load.
// This prevents the mic permission prompt from appearing before the camera prompt.