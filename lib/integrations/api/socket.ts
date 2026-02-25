import { API_CONFIG } from '../config/api-config';

let socket: any = null;
let socketPromise: Promise<any> | null = null;
let connectionAttempts = 0;
const MAX_RETRIES = 10;

export const getSocket = (token?: string): Promise<any> => {
  if (socket) return Promise.resolve(socket);
  if (socketPromise) return socketPromise;

  socketPromise = (async () => {
    try {
      // @ts-ignore
      const { io } = await import('socket.io-client');
      const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');

      console.log('🔌 Initializing Socket.IO connection to:', baseUrl);

      const socketInstance = io(baseUrl, {
        auth: {
          token: token || (typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null),
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
      });

      socketInstance.on('connect', () => {
        connectionAttempts = 0;
        console.log('📡 ✅ Connected to WebSocket server (ID:', socketInstance.id + ')');
      });

      socketInstance.on('connect_error', (err: any) => {
        connectionAttempts++;
        console.warn(`📡 ⚠️ Connection attempt ${connectionAttempts} failed:`, err.message);

        if (connectionAttempts >= MAX_RETRIES) {
          console.error('📡 ❌ Max connection retries reached. Real-time features disabled.');
        }
      });

      socketInstance.on('disconnect', (reason: string) => {
        console.log('📡 Disconnected from WebSocket server. Reason:', reason);
      });

      socketInstance.on('error', (err: any) => {
        console.error('📡 WebSocket error:', err);
      });

      socketInstance.on('reconnect', (attemptNumber: number) => {
        console.log(`📡 🔄 Reconnected after ${attemptNumber} attempts`);
      });

      socket = socketInstance;
      return socket;
    } catch (error) {
      console.error('📡 Failed to initialize Socket.IO:', error);
      socketPromise = null;
      return null;
    }
  })();

  return socketPromise;
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
