const rooms = {};

function generatePin() {
  let pin;
  do {
    pin = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms[pin]);
  return pin;
}

function createRoom(nickname, limit, socketId, deviceId) {
  const pin = generatePin();
  rooms[pin] = {
    pin,
    limit,
    ownerDeviceId: deviceId,
    users: []           // guardaremos { nickname, socketId, deviceId, ip }
  };
  return rooms[pin];
}

function getRoomByPin(pin) {
  return rooms[pin];
}

function joinRoom(pin, nickname, socketId, deviceId, ip) {
  rooms[pin].users.push({ nickname, socketId, deviceId, ip });
}

function leaveRoom(pin, socketId, deviceId) {
  const room = rooms[pin];
  if (!room) return;
  room.users = room.users.filter(
    u => u.socketId !== socketId && u.deviceId !== deviceId
  );
  if (room.users.length === 0) {
    delete rooms[pin];
  }
}

function deleteRoom(pin, deviceId) {
  const room = rooms[pin];
  if (!room) return false;
  if (room.ownerDeviceId !== deviceId) return false;
  delete rooms[pin];
  return true;
}

function removeEmptyRooms() {
  for (const pin in rooms) {
    if (rooms[pin].users.length === 0) {
      delete rooms[pin];
    }
  }
}

function isDeviceConnected(deviceId) {
  return Object.values(rooms).some(room =>
    room.users.some(u => u.deviceId === deviceId)
  );
}

function isIpConnectedInRoom(pin, ip) {
  const room = rooms[pin];
  if (!room) return false;
  return room.users.some(u => u.ip === ip);
}

function getActiveRooms() {
  return Object.values(rooms).map(({ pin, users, limit }) => ({
    pin,
    count: users.length,
    limit
  }));
}

module.exports = {
  createRoom,
  getRoomByPin,
  joinRoom,
  leaveRoom,
  deleteRoom,
  removeEmptyRooms,
  isDeviceConnected,
  isIpConnectedInRoom,
  getActiveRooms,
};
