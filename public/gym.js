const socket = io();

const container = document.getElementById("machines-container");
const totalMachinesEl = document.getElementById("total-machines");
const freeMachinesEl = document.getElementById("free-machines");
const occupiedMachinesEl = document.getElementById("occupied-machines");

const categoryFilter = document.getElementById("gym-category-filter");
const statusFilter = document.getElementById("gym-status-filter");

let allMachines = [];

// Cursor remoto
const remoteCursor = document.createElement("div");
remoteCursor.id = "remote-cursor";
remoteCursor.innerHTML = `<div class="remote-cursor-inner"></div>`;
document.body.appendChild(remoteCursor);

function getStatusLabel(status) {
  return status === "free" ? "Libre" : "Ocupada";
}

function getStatusClass(status) {
  return status === "free" ? "status-free" : "status-occupied";
}

function updateStats(machines) {
  const total = machines.length;
  const free = machines.filter((m) => m.status === "free").length;
  const occupied = machines.filter((m) => m.status === "occupied").length;

  totalMachinesEl.textContent = total;
  freeMachinesEl.textContent = free;
  occupiedMachinesEl.textContent = occupied;
}

function applyFilters(machines) {
  const selectedCategory = categoryFilter ? categoryFilter.value : "all";
  const selectedStatus = statusFilter ? statusFilter.value : "all";

  let filtered = [...machines];

  if (selectedCategory !== "all") {
    filtered = filtered.filter((machine) => machine.category === selectedCategory);
  }

  if (selectedStatus !== "all") {
    filtered = filtered.filter((machine) => machine.status === selectedStatus);
  }

  return filtered;
}

function renderMachines(machines) {
  container.innerHTML = "";

  const filteredMachines = applyFilters(machines);

  if (filteredMachines.length === 0) {
    container.innerHTML = `
      <div class="feedback-message">
        No hay máquinas que coincidan con los filtros seleccionados.
      </div>
    `;
    updateStats(machines);
    return;
  }

  filteredMachines.forEach((machine) => {
    const card = document.createElement("article");
    card.className = `machine-card visual-card ${machine.status}`;

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
          <span class="status-pill ${getStatusClass(machine.status)}">
            ${getStatusLabel(machine.status)}
          </span>
        </div>

        <div class="machine-details">
          <div class="detail-box">
            <span class="detail-label">Tiempo restante</span>
            <strong>${machine.remainingTime} min</strong>
          </div>

          ${
            machine.status === "occupied"
              ? `
                <div class="detail-box">
                  <span class="detail-label">Reservada por</span>
                  <strong>${machine.reservedBy || "Desconocido"}</strong>
                </div>
              `
              : ""
          }

          <div class="detail-box">
            <span class="detail-label">Tipo</span>
            <strong>${machine.subtype}</strong>
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  updateStats(machines);
}

socket.on("machines:update", (machines) => {
  allMachines = machines;
  renderMachines(allMachines);
});

if (categoryFilter) {
  categoryFilter.addEventListener("change", () => {
    renderMachines(allMachines);
  });
}

if (statusFilter) {
  statusFilter.addEventListener("change", () => {
    renderMachines(allMachines);
  });
}

// Mover cursor con un dedo
socket.on("cursor:update", ({ xRatio, yRatio }) => {
  const x = window.innerWidth * xRatio;
  const y = window.innerHeight * yRatio;

  remoteCursor.style.left = `${x}px`;
  remoteCursor.style.top = `${y}px`;
  remoteCursor.classList.add("visible");
});

// Ocultar cursor al levantar dedo
socket.on("cursor:hide", () => {
  remoteCursor.classList.remove("visible");
});

// Scroll con dos dedos
socket.on("cursor:scroll", ({ deltaY }) => {
  window.scrollBy({
    top: deltaY * 2.4,
    behavior: "auto"
  });
});