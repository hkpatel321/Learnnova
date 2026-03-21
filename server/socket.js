/**
 * socket.js — Singleton Socket.io instance.
 *
 * The io instance is created once in index.js via `initSocket(httpServer)`,
 * then imported by any route module that needs to emit events.
 */

import { Server } from 'socket.io';

let io = null;

/**
 * Called once from index.js after the http server is created.
 * @param {import('http').Server} httpServer
 * @param {string} clientUrl
 */
export function initSocket(httpServer, clientUrl) {
  io = new Server(httpServer, {
    cors: {
      origin: clientUrl || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    // Client sends { courseId } to subscribe to a course's real-time room
    socket.on('join_course', ({ courseId }) => {
      if (courseId) {
        socket.join(`course:${courseId}`);
      }
    });

    socket.on('leave_course', ({ courseId }) => {
      if (courseId) {
        socket.leave(`course:${courseId}`);
      }
    });
  });

  console.log('✅  Socket.io initialised');
  return io;
}

/**
 * Get the active io instance (for use inside route handlers).
 * @returns {import('socket.io').Server | null}
 */
export function getIO() {
  return io;
}
