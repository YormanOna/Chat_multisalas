require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const dns = require('dns');

const {
  createRoom,
  getRoomByPin,
  joinRoom,
  leaveRoom,
  deleteRoom,
  removeEmptyRooms,
  isDeviceConnected,
  getActiveRooms,
} = require('./controllers/roomManager');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST_DEVICE_ID = process.env.HOST_DEVICE_ID; // debe definirse en .env

// --- CORS ---
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} no permitido`));
  },
  methods: ['GET','POST']
}));
app.use(express.json());

// --- HTTP + Socket.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Socket.IO CORS: origin ${origin} no permitido`));
    },
    methods: ['GET','POST']
  }
});

io.on('connection', socket => {
  const clientIp = (socket.handshake.headers['x-forwarded-for']?.split(',')[0] || socket.handshake.address)
    .replace('::ffff:', '');
  const deviceId = socket.handshake.query.deviceId;
  const isHost = deviceId === HOST_DEVICE_ID;

  // Informar info de red y rol al cliente
  dns.reverse(clientIp, (err, hostnames) => {
    const hostname = err ? clientIp : hostnames[0];
    socket.emit('host_info', { ip: clientIp, hostname });
    socket.emit('host_status', { isHost });
    // <-- Aquí cambiamos a mostrar la IP en lugar del deviceId
    console.log(`🔌 Conexión: socketId=${socket.id}, ip=${clientIp}, isHost=${isHost}`);
  });

  // Listar salas activas + rol
  socket.on('get_rooms', (_, cb) => {
    const rooms = getActiveRooms();
    console.log(`📋 get_rooms solicitado por ip=${clientIp}, isHost=${isHost}`);
    cb({ success: true, rooms, isHost });
  });

  // Crear sala (solo anfitrión)
  socket.on('create_room', ({ nickname, limit }, cb) => {
    if (!isHost) {
      console.log(`❌ Intento de create_room sin permiso ip=${clientIp}`);
      return cb({ success: false, message: 'No autorizado' });
    }
    if (!nickname || !limit) {
      console.log(`❌ create_room parámetros faltantes por host ip=${clientIp}`);
      return cb({ success: false, message: 'Faltan parámetros' });
    }
    const room = createRoom(nickname, limit, null, deviceId);
    console.log(`🏠 Sala creada: PIN=${room.pin}, limit=${room.limit}, hostIp=${clientIp}`);
    cb({ success: true, pin: room.pin });
  });

  // Unirse a sala
  socket.on('join_room', ({ pin, nickname }, cb) => {
  console.log(`🔑 join_room: nickname=${nickname}, pin=${pin}, ip=${clientIp}`);

  // ✅ Validar primero si ya está en otra sala
  if (isDeviceConnected(deviceId)) {
    console.log(`❌ Dispositivo ya en sala: ip=${clientIp}, nickname=${nickname}`);
    return cb({ success: false, message: 'Ya estás en una sala' });
  }

  const room = getRoomByPin(pin);
  if (!room) {
    console.log(`❌ PIN inválido: ${pin} (nickname=${nickname})`);
    return cb({ success: false, message: 'PIN inválido' });
  }

  if (room.users.length >= room.limit) {
    console.log(`❌ Sala llena: PIN=${pin}, nickname=${nickname}`);
    return cb({ success: false, message: 'Sala llena' });
  }

  joinRoom(pin, nickname, socket.id, deviceId);
  socket.join(pin);
  socket.data = { pin, deviceId, nickname };
  console.log(`✅ Usuario unido: nickname=${nickname}, pin=${pin}, ip=${clientIp}`);

  const updated = getRoomByPin(pin);
  io.to(pin).emit('room_data', { users: updated.users, limit: updated.limit });
  cb({ success: true });
});


  // Enviar mensaje
  socket.on('send_message', ({ pin, autor, message }) => {
    console.log(`💬 [${pin}] ${autor} desde ${clientIp}: ${message}`);
    io.to(pin).emit('receive_message', { autor, message });
  });

  // Eliminar sala (solo anfitrión)
  socket.on('delete_room', ({ pin }, cb) => {
    console.log(`🗑️ delete_room solicitado por ip=${clientIp} en pin=${pin}`);
    if (!isHost) {
      console.log(`❌ delete_room no autorizado ip=${clientIp}`);
      return cb({ success: false, message: 'No autorizado' });
    }
    const ok = deleteRoom(pin, deviceId);
    if (!ok) {
      console.log(`❌ delete_room falló: sala no existe o no eres propietario pin=${pin}`);
      return cb({ success: false, message: 'No existe o no eres propietario' });
    }
    console.log(`✅ Sala eliminada: pin=${pin} por hostIp=${clientIp}`);
    io.to(pin).emit('room_deleted', { pin });
    cb({ success: true });
  });

  // Al desconectar
  socket.on('disconnect', () => {
    const { pin, deviceId: did, nickname } = socket.data || {};
    console.log(`🔌 Desconexión: nickname=${nickname}, ip=${clientIp}`);
    if (pin) {
      leaveRoom(pin, socket.id, did);
      const room = getRoomByPin(pin);
      if (room) {
        console.log(`🔄 room_data tras desconexión en pin=${pin}`);
        io.to(pin).emit('room_data', { users: room.users, limit: room.limit });
      }
      removeEmptyRooms();
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en puerto ${PORT}`);
});
