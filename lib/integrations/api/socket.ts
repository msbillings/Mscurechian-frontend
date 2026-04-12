import { API_CONFIG } from "../config/api-config";
import { getAccessToken } from "./apiClient";

let socket: any = null;
let socketPromise: Promise<any> | null = null;
let connectionAttempts = 0;
const MAX_RETRIES = 10;

// ✅ FIX #4 (complete): Store last join_room params so we can re-emit after
// token rotation forces a socket reconnect. Without this the socket would
// reconnect with the new token but stay in no rooms — all real-time events lost.
let _lastJoinPayload: { role: string; userId: string; hospitalId?: string } | null = null;

// ─── Socket Initialisation ────────────────────────────────────────────────────

export const getSocket = (token?: string): Promise<any> => {
  if (socket?.connected) return Promise.resolve(socket);
  if (socketPromise) return socketPromise;

  socketPromise = (async () => {
    try {
      // @ts-ignore
      const { io } = await import("socket.io-client");
      const baseUrl = API_CONFIG.WS_URL;

      // Always prefer the explicitly supplied token, then fall back to the
      // in-memory store (never localStorage — tokens are memory-only here).
      const resolvedToken = token || getAccessToken() || undefined;

      console.log(
        "🔌 Initializing Socket.IO connection to:",
        baseUrl,
        "| Token present:",
        !!resolvedToken
      );

      const socketInstance = io(baseUrl, {
        auth: { token: resolvedToken },
        transports: ["polling", "websocket"],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        autoConnect: true,
        path: "/socket.io/",
      });

      socketInstance.on("connect", () => {
        connectionAttempts = 0;
        console.log("📡 ✅ Connected to WebSocket server (ID:", socketInstance.id + ")");

        // ✅ Auto re-join rooms on every (re)connect — covers both initial
        // connection and reconnects after updateSocketToken() rotates the token.
        if (_lastJoinPayload) {
          console.log("🔌 Auto re-joining room after connect:", _lastJoinPayload);
          socketInstance.emit("join_room", _lastJoinPayload);
        }
      });

      socketInstance.on("connect_error", (err: any) => {
        connectionAttempts++;
        console.warn(
          `📡 ⚠️ WebSocket Connection Error (Attempt ${connectionAttempts}/${MAX_RETRIES}):`,
          err.message
        );
        if (err.description) console.warn("📡 Error Detail:", err.description);
        if (err.context) console.warn("📡 Error Context:", err.context);
        if (connectionAttempts >= MAX_RETRIES) {
          console.error(
            "📡 ❌ Max connection retries reached. Real-time features disabled. Backend URL:",
            baseUrl
          );
        }
      });

      socketInstance.on("disconnect", (reason: string) => {
        console.log("📡 Disconnected from WebSocket server. Reason:", reason);
      });

      socketInstance.on("error", (err: any) => {
        console.error("📡 WebSocket error:", err);
      });

      socketInstance.on("reconnect", (attemptNumber: number) => {
        console.log(`📡 🔄 Reconnected after ${attemptNumber} attempts`);
      });

      socket = socketInstance;
      return socket;
    } catch (error) {
      console.error("📡 Failed to initialize Socket.IO:", error);
      socketPromise = null;
      return null;
    }
  })();

  return socketPromise;
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketPromise = null;
  }
};

// ─── Token Rotation Handler ───────────────────────────────────────────────────

/**
 * ✅ FIX #4 (COMPLETE): Called by apiClient and authStore after every
 * successful token refresh.
 *
 * Strategy:
 *  1. Update socket.auth.token to the new access token IN-PLACE (no disconnect).
 *  2. Call socket.disconnect() then socket.connect() so the server receives
 *     the new token in the handshake.
 *  3. The "connect" listener above fires automatically and re-emits join_room
 *     with _lastJoinPayload so the user is back in their rooms immediately.
 *
 * This is safer than resetSocket() (which destroys the instance) because all
 * existing event listeners are preserved.
 */
export const updateSocketToken = async (newToken: string): Promise<void> => {
  if (!newToken) return;

  // Case 1: Socket not yet initialized — just create fresh with the new token.
  if (!socket) {
    await getSocket(newToken);
    return;
  }

  try {
    console.log("🔄 [Socket] Updating token after rotation — reconnecting...");

    // Update auth payload so the new token is sent in the next handshake.
    socket.auth = { token: newToken };

    // Force a clean reconnect cycle. The "connect" event handler will
    // automatically re-emit join_room with _lastJoinPayload.
    socket.disconnect();
    socket.connect();
  } catch (err) {
    console.warn("📡 [Socket] updateSocketToken failed:", err);
    // Fallback: full reinitialise
    disconnectSocket();
    await getSocket(newToken);
  }
};

/**
 * Full reset — use only on login/logout, not on token rotation.
 * Token rotation should use updateSocketToken() to preserve event listeners.
 */
export const resetSocket = async (newToken?: string): Promise<any> => {
  disconnectSocket();
  return getSocket(newToken || undefined);
};

// ─── Pub/Sub Helpers ──────────────────────────────────────────────────────────

export const subscribeToSocket = async (
  channel: string,
  event: string,
  callback: (data: any) => void
) => {
  const socketInstance = await getSocket();
  if (socketInstance) {
    socketInstance.on(event, callback);
  }
};

export const unsubscribeFromSocket = async (
  channel: string,
  event: string,
  callback: (data: any) => void
) => {
  const socketInstance = await getSocket();
  if (socketInstance) {
    socketInstance.off(event, callback);
  }
};

// ─── Room Management ──────────────────────────────────────────────────────────

export const joinSocketRoom = async (userData: {
  role: string;
  userId: string;
  hospitalId?: string;
}) => {
  // ✅ Persist payload so reconnect-after-rotation can re-emit automatically.
  _lastJoinPayload = userData;

  const socketInstance = await getSocket();

  if (socketInstance && socketInstance.connected) {
    console.log("🔌 Joining room with:", userData);
    socketInstance.emit("join_room", userData);
  } else if (socketInstance) {
    // Use 'once' — avoids stacking duplicate listeners on repeated calls.
    socketInstance.once("connect", () => {
      console.log("🔌 Joining room (on connect) with:", userData);
      socketInstance.emit("join_room", userData);
    });
  }
};

export const leaveSocketRoom = () => {
  _lastJoinPayload = null;
};
