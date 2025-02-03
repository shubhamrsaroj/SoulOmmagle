import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
    console.log('Socket connected successfully:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
});

socket.on('error', (error) => {
    console.error('Socket error:', error);
});

socket.on('matchFound', (data) => {
    console.log('Match found event received:', data);
});

socket.on('signal', (data) => {
    console.log('Signal received:', data);
});

export const initializeSocket = (userId) => {
    if (socket.connected) {
        socket.emit('setUserId', { userId });
    } else {
        socket.connect();
        socket.once('connect', () => {
            socket.emit('setUserId', { userId });
        });
    }
};

export default socket; 