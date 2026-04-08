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

let username = null;
let allMachines = [];
let selectedMachineId = null;
let selectedDurations = {};

loginBtn.addEventListener("click", () => {
  const value = usernameInput.value.trim();

  if (!value) {
    showFeedback("Introduce un nombre");
    return;
  }

  username = value;

  socket.emit("user:login", username);

  headerLogin.classList.add("hidden");
  headerUser.classList.remove("hidden");
  usernameDisplay.textContent = username;

  showFeedback(`Bienvenido ${username}`);
});

logoutBtn.addEventListener("click", () => {
  socket.emit("user:logout");

  username = null;
  selectedMachineId = null;

  headerUser.classList.add("hidden");
  headerLogin.classList.remove("hidden");

  usernameDisplay.textContent = "";
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

if (filterSelect) {
  filterSelect.addEventListener("change", () => {
    selectedMachineId = null;
    renderMachines(allMachines);
  });
}