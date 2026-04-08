const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Usuarios logueados en memoria: socket.id -> username
const users = {};

// Estado inicial de las máquinas
let machines = [
  // CARDIO
  {
    id: 1,
    name: "Cinta 1",
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
    name: "Bicicleta 1",
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

  // TREN SUPERIOR
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
    image: "/images/curl_biceps.gif",
    reservedBy: null
  },
  {
    id: 12,
    name: "Tríceps 1",
    category: "Tren superior",
    subtype: "Extensión de tríceps",
    status: "free",
    remainingTime: 0,
    zone: "Zona fuerza superior",
    image: "/images/triceps.png",
    reservedBy: null
  },

  // TREN INFERIOR
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

  // CORE
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

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Rutas principales
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/mobile", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "mobile.html"));
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  // Enviar estado inicial
  socket.emit("machines:update", machines);

  // Login simple
  socket.on("user:login", (username) => {
    const safeUsername = String(username || "").trim();

    if (!safeUsername) {
      return;
    }

    users[socket.id] = safeUsername;
    console.log("Usuario logueado:", safeUsername, "| socket:", socket.id);
  });

  // Reserva de máquina con duración
  socket.on("machine:reserve", ({ machineId, duration }) => {
    const parsedMachineId = Number(machineId);
    const parsedDuration = Number(duration);

    const allowedDurations = [5, 10, 15, 20, 25, 30];

    if (!allowedDurations.includes(parsedDuration)) {
      console.log("Duración no válida:", parsedDuration);
      return;
    }

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

    io.emit("machines:update", machines);
  });

  // Trackpad: movimiento del cursor
  socket.on("cursor:move", (data) => {
    socket.broadcast.emit("cursor:update", data);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
    delete users[socket.id];
  });
});

// Cada minuto baja 1 minuto en las máquinas ocupadas.
// Cuando llega a 0, la máquina vuelve a quedar libre.
setInterval(() => {
  let hasChanges = false;

  machines = machines.map((machine) => {
    if (machine.status === "occupied" && machine.remainingTime > 0) {
      hasChanges = true;

      const updatedRemainingTime = machine.remainingTime - 1;

      if (updatedRemainingTime <= 0) {
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
    io.emit("machines:update", machines);
  }
}, 60000);

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});