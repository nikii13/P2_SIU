const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

const users = {};

let machines = [
  {
    id: 1,
    name: "Cinta 1",
    category: "Cardio",
    subtype: "Cinta",
    status: "free",
    remainingTime: 0,
    zone: "Zona cardio",
    image: "/images/treadmill.png",
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
    image: "/images/spin-bike.png",
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
    image: "/images/elliptical.png",
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
    image: "/images/rowing-machine.png",
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
    image: "/images/stair-climber.png",
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
    image: "/images/chest-press.png",
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
    image: "/images/lat-pulldown.png",
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
    image: "/images/seated-row.png",
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
    image: "/images/shoulder-press.png",
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
    image: "/images/pec-deck.png",
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
    image: "/images/biceps-machine.png",
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
    image: "/images/triceps-machine.png",
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
    image: "/images/leg-press.png",
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
    image: "/images/leg-extension.png",
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
    image: "/images/leg-curl.png",
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
    image: "/images/abductor-machine.png",
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
    image: "/images/adductor-machine.png",
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
    image: "/images/hip-thrust-machine.png",
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
    image: "/images/calf-raise-machine.png",
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
    image: "/images/abdominal-machine.png",
    reservedBy: null
  }
];

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

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.emit("machines:update", machines);

  socket.on("user:login", (username) => {
    const safeUsername = String(username || "").trim();
    if (!safeUsername) return;
    users[socket.id] = safeUsername;
  });

  socket.on("user:logout", () => {
    delete users[socket.id];
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

    io.emit("machines:update", machines);
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
  });
});

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