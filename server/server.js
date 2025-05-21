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
  isIpConnectedInRoom,
  getActiveRooms,
} = require('./controllers/roomManager');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST_DEVICE_ID = process.env.HOST_DEVICE_ID;

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
  const clientIp = (socket.handshake.headers['x-forwarded-for']?.split(',')[0]
                    || socket.handshake.address).replace('::ffff:', '');
  const deviceId = socket.handshake.query.deviceId;
  const isHost = deviceId === HOST_DEVICE_ID;

  dns.reverse(clientIp, (err, hostnames) => {
    const hostname = err ? clientIp : hostnames[0];
    socket.emit('host_info', { ip: clientIp, hostname });
    socket.emit('host_status', { isHost });
    console.log(`🔌 Conexión: socketId=${socket.id}, ip=${clientIp}, isHost=${isHost}`);
  });

  socket.on('get_rooms', (_, cb) => {
    console.log(`📋 get_rooms solicitado por ip=${clientIp}, isHost=${isHost}`);
    cb({ success: true, rooms: getActiveRooms(), isHost });
  });

  socket.on('create_room', ({ nickname, limit }, cb) => {
    if (!isHost) {
      console.log(`❌ create_room no autorizado ip=${clientIp}`);
      return cb({ success: false, message: 'No autorizado' });
    }
    if (!nickname || !limit) {
      console.log(`❌ create_room faltan parámetros ip=${clientIp}`);
      return cb({ success: false, message: 'Faltan parámetros' });
    }
    const room = createRoom(nickname, limit, null, deviceId);
    console.log(`🏠 Sala creada: PIN=${room.pin}, hostIp=${clientIp}`);
    cb({ success: true, pin: room.pin });
  });

  socket.on('join_room', ({ pin, nickname }, cb) => {
    console.log(`🔑 join_room: nickname=${nickname}, pin=${pin}, ip=${clientIp}`);

    // Validar: no en otra sala
    if (isDeviceConnected(deviceId)) {
      console.log(`❌ Ya en otra sala: deviceId=${deviceId}`);
      return cb({ success: false, message: 'Ya estás en una sala' });
    }

    const room = getRoomByPin(pin);
    if (!room) {
      console.log(`❌ PIN inválido: ${pin}`);
      return cb({ success: false, message: 'PIN inválido' });
    }

    // NUEVO: validar que la IP no esté ya en esta sala
    if (isIpConnectedInRoom(pin, clientIp)) {
      console.log(`❌ IP ya unida en esta sala: ip=${clientIp}, pin=${pin}`);
      return cb({ success: false, message: 'Desde esta IP ya estás en la sala' });
    }

    if (room.users.length >= room.limit) {
      console.log(`❌ Sala llena: PIN=${pin}`);
      return cb({ success: false, message: 'Sala llena' });
    }

    joinRoom(pin, nickname, socket.id, deviceId, clientIp);
    socket.join(pin);
    socket.data = { pin, deviceId, nickname, ip: clientIp };
    console.log(`✅ Usuario unido: nickname=${nickname}, pin=${pin}, ip=${clientIp}`);

    const updated = getRoomByPin(pin);
    io.to(pin).emit('room_data', { users: updated.users, limit: updated.limit });
    cb({ success: true });
  });

  socket.on('send_message', ({ pin, autor, message }) => {
    console.log(`💬 [${pin}] ${autor} desde ${clientIp}: ${message}`);
    io.to(pin).emit('receive_message', { autor, message });
  });

  socket.on('delete_room', ({ pin }, cb) => {
    console.log(`🗑️ delete_room: ip=${clientIp}, pin=${pin}`);
    if (!isHost) {
      return cb({ success: false, message: 'No autorizado' });
    }
    const ok = deleteRoom(pin, deviceId);
    if (!ok) {
      return cb({ success: false, message: 'No existe o no eres propietario' });
    }
    io.to(pin).emit('room_deleted', { pin });
    console.log(`✅ Sala eliminada: pin=${pin}`);
    cb({ success: true });
  });

  socket.on('disconnect', () => {
    const { pin, deviceId: did, ip } = socket.data || {};
    console.log(`🔌 Desconexión: ip=${clientIp}`);
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
