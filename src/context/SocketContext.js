import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = 'http://localhost:5000';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      try {
        // Create socket instance
        const socketInstance = io(SOCKET_URL, {
          query: { userId: currentUser.uid },
          transports: ['websocket'],
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5
        });

        // Connection event handlers
        socketInstance.on('connect', () => {
          console.log('Socket connected with ID:', socketInstance.id);
          setIsConnected(true);
        });

        socketInstance.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
        });

        socketInstance.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
        });

        // Set socket instance to state
        setSocket(socketInstance);

        // Cleanup on unmount
        return () => {
          if (socketInstance) {
            socketInstance.disconnect();
          }
        };
      } catch (err) {
        console.error('Error setting up socket:', err);
        setIsConnected(false);
      }
    } else {
      setSocket(null);
      setIsConnected(false);
    }
  }, [currentUser]);

  const value = {
    socket,
    isConnected,
    emit: (...args) => socket?.emit(...args),
    on: (...args) => socket?.on(...args),
    off: (...args) => socket?.off(...args)
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
} 