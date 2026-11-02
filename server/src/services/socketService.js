const { Server } = require('socket.io');

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.endsWith('.vercel.app') || origin.includes('localhost') || origin === process.env.CLIENT_URL) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on('join', (roomName) => {
      socket.join(roomName);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO was requested before initSocket() was called');
  }
  return io;
}

module.exports = { initSocket, getIO };