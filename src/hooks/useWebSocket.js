import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3101';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3101';

export function useWebSocket() {
  const wsRef = useRef(null);
  const [readyState, setReadyState] = useState(WebSocket.CLOSED);
  const [playerId, setPlayerId] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [roomState, setRoomState] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [gameEnd, setGameEnd] = useState(null);
  const [guessedInfo, setGuessedInfo] = useState(null);
  const [error, setError] = useState(null);

  const reconnectTimeoutRef = useRef(null);
  const pendingJoinRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setReadyState(WebSocket.OPEN);
      setError(null);
      // Rejoin if we had a pending join
      if (pendingJoinRef.current) {
        ws.send(JSON.stringify(pendingJoinRef.current));
      }
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'joined':
          setPlayerId(msg.playerId);
          setRoomId(msg.roomId);
          break;
        case 'room_state':
          setRoomState(msg);
          break;
        case 'game_start':
        case 'next_round':
          setGameState(msg);
          setRoundResult(null);
          setGuessedInfo(null);
          break;
        case 'player_guessed':
          setGuessedInfo(msg);
          break;
        case 'round_result':
          setRoundResult(msg);
          break;
        case 'game_end':
          setGameEnd(msg);
          break;
        case 'error':
          setError(msg.message);
          break;
      }
    };

    ws.onclose = () => {
      setReadyState(WebSocket.CLOSED);
      // Auto-reconnect after 2 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (pendingJoinRef.current) {
          connect();
        }
      }, 2000);
    };

    ws.onerror = () => {
      setError('サーバーに接続できません');
    };
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    pendingJoinRef.current = null;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const createRoom = useCallback(async (timeLimit) => {
    const res = await fetch(`${API_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeLimit: timeLimit || 0 }),
    });
    const data = await res.json();
    return data.roomId;
  }, []);

  const joinRoom = useCallback((roomId, playerName) => {
    const joinMsg = { type: 'join', roomId, playerName };
    pendingJoinRef.current = joinMsg;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      send(joinMsg);
    } else {
      connect();
    }
  }, [connect, send]);

  const startGame = useCallback((timeLimit) => {
    send({ type: 'start_game', timeLimit: timeLimit || 0 });
  }, [send]);

  const submitGuess = useCallback((lat, lng) => {
    send({ type: 'submit_guess', lat, lng });
  }, [send]);

  const nextRound = useCallback(() => {
    send({ type: 'next_round' });
  }, [send]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    readyState,
    playerId,
    roomId,
    roomState,
    gameState,
    roundResult,
    gameEnd,
    guessedInfo,
    error,
    createRoom,
    joinRoom,
    startGame,
    submitGuess,
    nextRound,
    disconnect,
  };
}
