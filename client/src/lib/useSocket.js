/**
 * useSocket.js — singleton Socket.io-client connection.
 *
 * Usage:
 *   const socket = useSocket();
 *   useEffect(() => {
 *     socket.emit('join_course', { courseId });
 *     socket.on('progress_update', handler);
 *     return () => { socket.off('progress_update', handler); socket.emit('leave_course', { courseId }); };
 *   }, [courseId]);
 */

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Single connection shared across the entire app
let socketInstance = null;

function getSocket() {
  if (!socketInstance) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
    socketInstance = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: { token },
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id);
    });
    socketInstance.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });
    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });
  }
  return socketInstance;
}

/**
 * Returns the shared socket instance.
 * Connects on first call, reuses the same socket on subsequent calls.
 */
export function useSocket() {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = getSocket();
  }, []);

  return getSocket();
}
