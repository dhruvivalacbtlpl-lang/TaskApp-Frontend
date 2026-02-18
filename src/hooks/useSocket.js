import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

// ✅ Single shared socket instance across the app
let socket;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { withCredentials: true });
  }
  return socket;
}

// ✅ Hook — listen to an event, auto cleanup on unmount
export function useSocket(event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const s = getSocket();
    const listener = (...args) => handlerRef.current(...args);
    s.on(event, listener);
    return () => s.off(event, listener); // cleanup
  }, [event]);
}