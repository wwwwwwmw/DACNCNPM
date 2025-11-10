let ioInstance = null;

function initSocket(server) {
  const { Server } = require('socket.io');
  const io = new Server(server, { cors: { origin: '*'} });
  const jwt = require('jsonwebtoken');

  io.on('connection', (socket) => {
    // Support token via handshake auth or query
    const token = socket.handshake?.auth?.token || socket.handshake?.query?.token;
    if (token) {
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwt');
        socket.data.user = user;
        socket.join(`user:${user.id}`);
      } catch (e) {
        // ignore invalid token, connection remains but not joined to a user room
      }
    }

    socket.on('authenticate', ({ token: t }) => {
      try {
        const user = jwt.verify(t, process.env.JWT_SECRET || 'supersecretjwt');
        socket.data.user = user;
        socket.join(`user:${user.id}`);
        socket.emit('authenticated');
      } catch (e) {
        socket.emit('auth_error', { message: 'Invalid token' });
      }
    });

    socket.on('disconnect', () => {
      // cleanup handled by socket.io
    });
  });

  ioInstance = io;
  return io;
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.IO not initialized');
  return ioInstance;
}

function emitToUser(userId, event, data) {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, data);
}

module.exports = { initSocket, getIO, emitToUser };
