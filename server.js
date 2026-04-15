const express = require("express");
const http = require("http");
const https = require("https");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT || 3443);

const users = {};
const socketToUsername = users;

const QUEUE_AUTO_RESERVE_MINUTES = 10;

function nowMs() {
  return Date.now();
}

function safeName(name) {
  return String(name || "").trim();
}

let machines = [
  {
    id: 1,
    name: "Cinta uno",
    category: "Cardio",
    subtype: "Cinta",
    status: "free",
    remainingTime: 0,
    zone: "Zona cardio",
    image: "/images/cinta.png",
    reservedBy: null
  },
  {
    id: 2,
    name: "Bicicleta uno",
    category: "Cardio",
    subtype: "Bicicleta",
    status: "occupied",
    remainingTime: 9,
    zone: "Zona cardio",
    image: "/images/bici.png",
    reservedBy: "Usuario demo"
  },
  {
    id: 3,
    name: "Elíptica 1",
    category: "Cardio",
    subtype: "Elíptica",
    status: "free",
    remainingTime: 0,
    zone: "Zona cardio",
    image: "/images/eliptica.png",
    reservedBy: null
  },
  {
    id: 4,
    name: "Remo 1",
    category: "Cardio",
    subtype: "Remo",
    status: "occupied",
    remainingTime: 6,
    zone: "Zona cardio",
    image: "/images/remo.png",
    reservedBy: "Usuario demo"
  },
  {
    id: 5,
    name: "Escaladora 1",
    category: "Cardio",
    subtype: "Escaladora",
    status: "free",
    remainingTime: 0,
    zone: "Zona cardio",
    image: "/images/escalera.png",
    reservedBy: null
  },
  {
    id: 6,
    name: "Press de pecho 1",
    category: "Tren superior",
    subtype: "Press de pecho",
    status: "free",
    remainingTime: 0,
    zone: "Zona fuerza superior",
    image: "/images/press.jpeg",
    reservedBy: null
  },
  {
    id: 7,
    name: "Jalón al pecho 1",
    category: "Tren superior",
    subtype: "Jalón",
    status: "occupied",
    remainingTime: 12,
    zone: "Zona fuerza superior",
    image: "/images/jalon_pecho.gif",
    reservedBy: "Usuario demo"
  },
  {
    id: 8,
    name: "Remo sentado 1",
    category: "Tren superior",
    subtype: "Remo sentado",
    status: "free",
    remainingTime: 0,
    zone: "Zona fuerza superior",
    image: "/images/remo_sentado.jpg",
    reservedBy: null
  },
  {
    id: 9,
    name: "Press de hombros 1",
    category: "Tren superior",
    subtype: "Press de hombros",
    status: "free",
    remainingTime: 0,
    zone: "Zona fuerza superior",
    image: "/images/press_hombro.jpg",
    reservedBy: null
  },
  {
    id: 10,
    name: "Peck deck 1",
    category: "Tren superior",
    subtype: "Peck deck",
    status: "occupied",
    remainingTime: 15,
    zone: "Zona fuerza superior",
    image: "/images/peck.jpg",
    reservedBy: "Usuario demo"
  },
  {
    id: 11,
    name: "Curl bíceps 1",
    category: "Tren superior",
    subtype: "Curl de bíceps",
    status: "free",
    remainingTime: 0,
    zone: "Zona fuerza superior",
    image: "/images/curl_biceps.gifg",
    reservedBy: null
  },
  {
    id: 12,
    name: "Tricep Extension",
    category: "Tren superior",
    subtype: "Extensión de tríceps",
    status: "free",
    remainingTime: 0,
    zone: "Zona fuerza superior",
    image: "/images/triceps.png",
    reservedBy: null
  },
  {
    id: 13,
    name: "Prensa de piernas 1",
    category: "Tren inferior",
    subtype: "Prensa",
    status: "occupied",
    remainingTime: 10,
    zone: "Zona pierna",
    image: "/images/prensa_pierna.jpg",
    reservedBy: "Usuario demo"
  },
  {
    id: 14,
    name: "Extensión cuádriceps 1",
    category: "Tren inferior",
    subtype: "Extensión de cuádriceps",
    status: "free",
    remainingTime: 0,
    zone: "Zona pierna",
    image: "/images/extension_cuadriceps.jpeg",
    reservedBy: null
  },
  {
    id: 15,
    name: "Curl femoral 1",
    category: "Tren inferior",
    subtype: "Curl femoral",
    status: "free",
    remainingTime: 0,
    zone: "Zona pierna",
    image: "/images/femoral.jpeg",
    reservedBy: null
  },
  {
    id: 16,
    name: "Abductores 1",
    category: "Tren inferior",
    subtype: "Abductores",
    status: "free",
    remainingTime: 0,
    zone: "Zona pierna",
    image: "/images/abductor_m.gif",
    reservedBy: null
  },
  {
    id: 17,
    name: "Aductores 1",
    category: "Tren inferior",
    subtype: "Aductores",
    status: "occupied",
    remainingTime: 8,
    zone: "Zona pierna",
    image: "/images/aductor.gif",
    reservedBy: "Usuario demo"
  },
  {
    id: 18,
    name: "Hip thrust 1",
    category: "Tren inferior",
    subtype: "Hip thrust",
    status: "free",
    remainingTime: 0,
    zone: "Zona glúteo",
    image: "/images/hip-thrust.png",
    reservedBy: null
  },
  {
    id: 19,
    name: "Gemelos 1",
    category: "Tren inferior",
    subtype: "Elevación de gemelos",
    status: "free",
    remainingTime: 0,
    zone: "Zona pierna",
    image: "/images/gemelos.jpeg",
    reservedBy: null
  },
  {
    id: 20,
    name: "Abdominales 1",
    category: "Core",
    subtype: "Banco abdominal guiado",
    status: "free",
    remainingTime: 0,
    zone: "Zona core",
    image: "/images/abdominales.jpg",
    reservedBy: null
  }
];

// ===== QUEUES (per machine) =====
// Each entry: { username, socketId, priorityRemaining, enqueuedAtMs }
const machineQueues = new Map(); // machineId -> entry[]

function getMachine(machineId) {
  const id = Number(machineId);
  return machines.find((m) => m.id === id) || null;
}

function getQueue(machineId) {
  const id = Number(machineId);
  if (!machineQueues.has(id)) machineQueues.set(id, []);
  return machineQueues.get(id);
}

function removeFromAllQueuesBySocket(socketId) {
  for (const [mid, q] of machineQueues.entries()) {
    const next = q.filter((e) => e.socketId !== socketId);
    if (next.length !== q.length) machineQueues.set(mid, next);
  }
}

function removeFromMachineQueue(machineId, socketId) {
  const q = getQueue(machineId);
  const next = q.filter((e) => e.socketId !== socketId);
  machineQueues.set(Number(machineId), next);
}

function userCurrentRemaining(username) {
  const name = safeName(username);
  if (!name) return Number.POSITIVE_INFINITY;
  let best = Number.POSITIVE_INFINITY;
  for (const m of machines) {
    if (m.status === "occupied" && safeName(m.reservedBy) === name) {
      best = Math.min(best, Number(m.remainingTime) || 0);
    }
  }
  return best;
}

function computeAndSortQueue(machineId) {
  const id = Number(machineId);
  const q = getQueue(id);
  // recompute priorityRemaining each time (as remaining times change)
  for (const entry of q) {
    entry.priorityRemaining = userCurrentRemaining(entry.username);
  }
  q.sort((a, b) => {
    const ar = Number.isFinite(a.priorityRemaining) ? a.priorityRemaining : 1e9;
    const br = Number.isFinite(b.priorityRemaining) ? b.priorityRemaining : 1e9;
    if (ar !== br) return ar - br;
    return a.enqueuedAtMs - b.enqueuedAtMs;
  });
  machineQueues.set(id, q);
  return q;
}

function broadcastMachinesUpdate(ioInstance) {
  const payload = machines.map((m) => {
    const q = getQueue(m.id);
    return {
      ...m,
      waitQueueLength: q.length,
      waitQueue: q.map((e) => e.username)
    };
  });
  ioInstance.emit("machines:update", payload);
}

function tryAutoReserveNext(ioInstance, machineId) {
  const m = getMachine(machineId);
  if (!m) return;
  if (m.status !== "free") return;

  const q = computeAndSortQueue(machineId);
  if (q.length === 0) return;

  const top = q[0];
  removeFromMachineQueue(machineId, top.socketId);

  machines = machines.map((machine) => {
    if (machine.id === Number(machineId) && machine.status === "free") {
      return {
        ...machine,
        status: "occupied",
        remainingTime: QUEUE_AUTO_RESERVE_MINUTES,
        reservedBy: top.username
      };
    }
    return machine;
  });

  const updated = getMachine(machineId);
  if (updated) {
    ioInstance.to(top.socketId).emit("machine:vacant", {
      machineId: Number(machineId),
      machineName: updated.name,
      duration: QUEUE_AUTO_RESERVE_MINUTES
    });
  }

  broadcastMachinesUpdate(ioInstance);
}

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/mobile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "mobile.html"));
});

app.get("/trackpad", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "trackpad.html"));
});

app.get("/gesture", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "gesture.html"));
});

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Always include queue metadata in updates.
  socket.emit(
    "machines:update",
    machines.map((m) => ({
      ...m,
      waitQueueLength: getQueue(m.id).length,
      waitQueue: getQueue(m.id).map((e) => e.username)
    }))
  );

  socket.on("user:login", (username) => {
    const safeUsername = safeName(username);
    if (!safeUsername) return;
    users[socket.id] = safeUsername;
  });

  socket.on("user:logout", () => {
    delete users[socket.id];
    removeFromAllQueuesBySocket(socket.id);
  });

  socket.on("machine:reserve", ({ machineId, duration }) => {
    const parsedMachineId = Number(machineId);
    const parsedDuration = Number(duration);
    const allowedDurations = [5, 10, 15, 20, 25, 30];

    if (!allowedDurations.includes(parsedDuration)) return;

    machines = machines.map((machine) => {
      if (machine.id === parsedMachineId && machine.status === "free") {
        return {
          ...machine,
          status: "occupied",
          remainingTime: parsedDuration,
          reservedBy: users[socket.id] || "Anónimo"
        };
      }
      return machine;
    });

    // If someone reserves, clear offers/queue for that machine (reservation is now taken).
    // remove reserver from queue too if present
    removeFromMachineQueue(parsedMachineId, socket.id);
    broadcastMachinesUpdate(io);
  });

  socket.on("machine:free", ({ machineId }) => {
    const parsedId = Number(machineId);
    machines = machines.map((machine) => {
      if (machine.id === parsedId && machine.status === "occupied" && machine.reservedBy === (users[socket.id] || "")) {
        return { ...machine, status: "free", remainingTime: 0, reservedBy: null };
      }
      return machine;
    });
    broadcastMachinesUpdate(io);
    tryAutoReserveNext(io, parsedId);
  });

  socket.on("machine:queue:join", ({ machineId }) => {
    const parsedId = Number(machineId);
    const username = users[socket.id] || null;
    const machine = getMachine(parsedId);
    if (!machine || !username) return;
    if (machine.status !== "occupied") return;

    const q = getQueue(parsedId);
    const already = q.some((e) => e.socketId === socket.id);
    if (already) {
      computeAndSortQueue(parsedId);
      broadcastMachinesUpdate(io);
      return;
    }

    q.push({
      username,
      socketId: socket.id,
      priorityRemaining: userCurrentRemaining(username),
      enqueuedAtMs: nowMs()
    });
    machineQueues.set(parsedId, q);
    computeAndSortQueue(parsedId);
    broadcastMachinesUpdate(io);
  });

  socket.on("machine:queue:leave", ({ machineId }) => {
    const parsedId = Number(machineId);
    removeFromMachineQueue(parsedId, socket.id);
    broadcastMachinesUpdate(io);
  });

  socket.on("cursor:update", ({ xRatio, yRatio }) => {
    const safeX = Math.max(0, Math.min(1, Number(xRatio)));
    const safeY = Math.max(0, Math.min(1, Number(yRatio)));

    socket.broadcast.emit("cursor:update", {
      xRatio: safeX,
      yRatio: safeY
    });
  });

  socket.on("cursor:hide", () => {
    socket.broadcast.emit("cursor:hide");
  });

  socket.on("cursor:scroll", ({ deltaY }) => {
    const safeDelta = Number(deltaY) || 0;
    socket.broadcast.emit("cursor:scroll", { deltaY: safeDelta });
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    removeFromAllQueuesBySocket(socket.id);
  });
});

setInterval(() => {
  let hasChanges = false;
  const freed = [];

  machines = machines.map((machine) => {
    if (machine.status === "occupied" && machine.remainingTime > 0) {
      hasChanges = true;
      const updatedRemainingTime = machine.remainingTime - 1;

      if (updatedRemainingTime <= 0) {
        freed.push(machine.id);
        return {
          ...machine,
          status: "free",
          remainingTime: 0,
          reservedBy: null
        };
      }

      return {
        ...machine,
        remainingTime: updatedRemainingTime
      };
    }

    return machine;
  });

  if (hasChanges) {
    // recompute queue priorities and then broadcast
    for (const m of machines) computeAndSortQueue(m.id);
    broadcastMachinesUpdate(io);
    for (const mid of freed) {
      tryAutoReserveNext(io, mid);
    }
  }
}, 60000);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Optional HTTPS server for mobile camera access.
// iOS Safari (and most browsers) require secure context (HTTPS) for getUserMedia() on non-localhost hosts.
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;

if (SSL_KEY_PATH && SSL_CERT_PATH) {
  try {
    const key = fs.readFileSync(SSL_KEY_PATH);
    const cert = fs.readFileSync(SSL_CERT_PATH);

    const httpsServer = https.createServer({ key, cert }, app);
    const httpsIo = new Server(httpsServer);

    // Mirror the same socket handlers on HTTPS.
    httpsIo.on("connection", (socket) => io.emit("connection", socket));

    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`Servidor HTTPS corriendo en https://localhost:${HTTPS_PORT}`);
    });
  } catch (e) {
    console.error("No se pudo iniciar HTTPS:", e.message || e);
  }
}