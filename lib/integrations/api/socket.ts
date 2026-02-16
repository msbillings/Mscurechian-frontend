import { API_CONFIG } from '../config/api-config';

let socket: any = null;
let connectionAttempts = 0;
const MAX_RETRIES = 10;

export const getSocket = async (token?: string): Promise<any> => {
  if (!socket) {
    try {
      // @ts-ignore
      const { io } = await import('socket.io-client');
      const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');

      console.log('🔌 Initializing Socket.IO connection to:', baseUrl);

      socket = io(baseUrl, {
        auth: {
          token: token || (typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null),
        },
        transports: ['websocket', 'polling'], // Allow fallback to polling
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
      });

      socket.on('connect', () => {
        connectionAttempts = 0;
        console.log('📡 ✅ Connected to WebSocket server (ID:', socket.id + ')');
      });

      socket.on('connect_error', (err: any) => {
        connectionAttempts++;
        console.warn(`📡 ⚠️ Connection attempt ${connectionAttempts} failed:`, err.message);

        if (connectionAttempts >= MAX_RETRIES) {
          console.error('📡 ❌ Max connection retries reached. Real-time features disabled.');
        }
      });

      socket.on('disconnect', (reason: string) => {
        console.log('📡 Disconnected from WebSocket server. Reason:', reason);
      });

      socket.on('error', (err: any) => {
        console.error('📡 WebSocket error:', err);
      });

      socket.on('reconnect', (attemptNumber: number) => {
        console.log(`📡 🔄 Reconnected after ${attemptNumber} attempts`);
      });

    } catch (error) {
      console.error('📡 Failed to initialize Socket.IO:', error);
      return null;
    }
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeToSocket = async (channel: string, event: string, callback: (data: any) => void) => {
  const socketInstance = await getSocket();
  if (socketInstance) {
    socketInstance.on(event, callback);
  }
};

export const unsubscribeFromSocket = async (channel: string, event: string, callback: (data: any) => void) => {
  const socketInstance = await getSocket();
  if (socketInstance) {
    socketInstance.off(event, callback);
  }
  if (socketInstance) {
    socketInstance.off(event, callback);
  }
};

export const joinSocketRoom = async (userData: { role: string; userId: string; hospitalId?: string }) => {
  const socketInstance = await getSocket();
  if (socketInstance && socketInstance.connected) {
    console.log('🔌 Joining room with:', userData);
    socketInstance.emit('join_room', userData);
  } else if (socketInstance) {
    // If not connected yet, wait for connection
    socketInstance.on('connect', () => {
      console.log('🔌 Joining room (on connect) with:', userData);
      socketInstance.emit('join_room', userData);
    });
  }
};
