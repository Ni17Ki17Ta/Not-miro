import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '../socket/client';
import { useBoardStore } from '../store/board';

/**
 * Управляет жизненным циклом Socket.IO-соединения.
 * Подключается при монтировании компонента (Board),
 * отключается при размонтировании.
 */
export function useSocket() {
  const setConnection = useBoardStore((s) => s.setConnection);
  const resetHistory = useBoardStore((s) => s.resetHistory);
  const connectedRef = useRef(false);

  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => {
      setConnection('connected');
      connectedRef.current = true;
    };

    const onDisconnect = () => {
      setConnection('disconnected');
      connectedRef.current = false;
    };

    const onConnectError = (err: Error) => {
      setConnection('reconnecting');
      console.error('[socket] connect error:', err.message);
    };

    const onReconnectAttempt = () => {
      setConnection('reconnecting');
    };

    const onReconnect = () => {
      setConnection('connected');
      connectedRef.current = true;
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.io.on('reconnect', onReconnect);

    // Если уже подключён (быстрый переход между досками) — сразу connected
    if (socket.connected) {
      setConnection('connected');
      connectedRef.current = true;
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.io.off('reconnect', onReconnect);
      resetHistory();
      disconnectSocket();
    };
  }, [setConnection, resetHistory]);
}