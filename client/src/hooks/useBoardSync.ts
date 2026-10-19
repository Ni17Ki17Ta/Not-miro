import { useEffect, useCallback } from 'react';
import { useBoardStore } from '../store/board';
import { getSocket } from '../socket/client';
import type { BoardElement, Operation } from '../types';

interface JoinAck {
  ok: boolean;
  isOwner?: boolean;
  error?: string;
}

export function useBoardSync(boardId: string, inviteToken?: string) {
  const applyRemoteOperation = useBoardStore((s) => s.applyRemoteOperation);
  const setElements = useBoardStore((s) => s.setElements);
  const setIsOwner = useBoardStore((s) => s.setIsOwner);
  const setParticipants = useBoardStore((s) => s.setParticipants);
  const addParticipant = useBoardStore((s) => s.addParticipant);
  const removeParticipant = useBoardStore((s) => s.removeParticipant);
  const setCursor = useBoardStore((s) => s.setCursor);
  const removeCursor = useBoardStore((s) => s.removeCursor);

  useEffect(() => {
    const socket = getSocket();

    const doJoin = () => {
      socket.emit('join-board', { boardId, inviteToken }, (ack: JoinAck) => {
        if (!ack?.ok) {
          console.error('[sync] join failed:', ack?.error);
        }
      });
    };

    const onBoardState = (data: { elements: BoardElement[]; isOwner: boolean }) => {
      setElements(data.elements || []);
      setIsOwner(!!data.isOwner);
    };

    const onOperation = (op: Operation) => {
      applyRemoteOperation(op);
    };

    const onParticipants = (list: { socketId: string; userName: string; color: string }[]) => {
      setParticipants(list);
    };

    const onUserJoined = (p: { socketId: string; userName: string; color: string }) => {
      addParticipant(p);
    };

    const onUserLeft = (data: { socketId: string }) => {
      removeParticipant(data.socketId);
      removeCursor(data.socketId);
    };

    const onCursor = (c: {
      socketId: string;
      userName: string;
      color: string;
      x: number;
      y: number;
    }) => {
      setCursor(c);
    };

    socket.on('board-state', onBoardState);
    socket.on('board-operation', onOperation);
    socket.on('participants', onParticipants);
    socket.on('user-joined', onUserJoined);
    socket.on('user-left', onUserLeft);
    socket.on('cursor-move', onCursor);

    if (socket.connected) doJoin();
    socket.on('connect', doJoin);

    // Принудительное сохранение при закрытии/обновлении страницы
    const handleBeforeUnload = () => {
      if (socket.connected) {
        socket.emit('save-now');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      socket.off('board-state', onBoardState);
      socket.off('board-operation', onOperation);
      socket.off('participants', onParticipants);
      socket.off('user-joined', onUserJoined);
      socket.off('user-left', onUserLeft);
      socket.off('cursor-move', onCursor);
      socket.off('connect', doJoin);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.emit('leave-board');
    };
  }, [
    boardId,
    inviteToken,
    applyRemoteOperation,
    setElements,
    setIsOwner,
    setParticipants,
    addParticipant,
    removeParticipant,
    setCursor,
    removeCursor,
  ]);

  const sendOperation = useCallback((op: Operation) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('board-operation', op);
    }
  }, []);

  const sendCursor = useCallback((x: number, y: number) => {
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('cursor-move', { x, y });
    }
  }, []);

  return { sendOperation, sendCursor };
}