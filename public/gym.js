const socket = io();
const container = document.getElementById("machines-container");

const totalMachinesEl = document.getElementById("total-machines");
const freeMachinesEl = document.getElementById("free-machines");
const occupiedMachinesEl = document.getElementById("occupied-machines");

// ===== HELPERS =====
function getStatusLabel(status) {
  return status === "free" ? "Libre" : "Ocupada";
}

function getStatusClass(status) {
  return status === "free" ? "status-free" : "status-occupied";
}

// ===== STATS =====
function updateStats(machines) {
  const total = machines.length;
  const free = machines.filter((m) => m.status === "free").length;
  const occupied = machines.filter((m) => m.status === "occupied").length;

  totalMachinesEl.textContent = total;
  freeMachinesEl.textContent = free;
  occupiedMachinesEl.textContent = occupied;
}

// ===== RENDER =====
function renderMachines(machines) {
  container.innerHTML = "";

  machines.forEach((machine) => {
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

// ===== SOCKET =====
socket.on("machines:update", (machines) => {
  renderMachines(machines);
});