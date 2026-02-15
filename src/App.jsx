import { useState, useEffect } from 'react';
import Game from './components/Game';
import ModeSelect from './components/ModeSelect';
import LocalMultiGame from './components/LocalMultiGame';
import OnlineLobby from './components/OnlineLobby';
import OnlineMultiGame from './components/OnlineMultiGame';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const [mode, setMode] = useState('select'); // 'select' | 'solo' | 'local' | 'online-lobby' | 'online-game'
  const [localPlayers, setLocalPlayers] = useState([]);
  const [timeLimit, setTimeLimit] = useState(30);
  const ws = useWebSocket();

  // URLパラメータでルーム直接参加
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setMode('online-lobby');
      window.history.replaceState({}, '', window.location.pathname);
      handleModeSelect({ mode: 'online-lobby', action: 'join', roomId: roomParam.toUpperCase(), playerName: 'ゲスト', timeLimit: 30 });
    }
  }, []);

  // Watch for game_start from server
  useEffect(() => {
    if (ws.gameState && mode === 'online-lobby') {
      setMode('online-game');
    }
  }, [ws.gameState, mode]);

  const handleModeSelect = async (selection) => {
    if (selection.timeLimit !== undefined) {
      setTimeLimit(selection.timeLimit);
    }
    switch (selection.mode) {
      case 'solo':
        setMode('solo');
        break;
      case 'local':
        setLocalPlayers(selection.players);
        setMode('local');
        break;
      case 'online-lobby':
        if (selection.action === 'create') {
          const roomId = await ws.createRoom(selection.timeLimit);
          ws.joinRoom(roomId, selection.playerName);
        } else {
          ws.joinRoom(selection.roomId, selection.playerName);
        }
        setMode('online-lobby');
        break;
    }
  };

  const handleBackToSelect = () => {
    ws.disconnect();
    setMode('select');
  };

  const showHeader = mode === 'select';

  return (
    <div className="h-full flex flex-col">
      {showHeader && (
        <header className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between border-b border-gray-700">
          <h1 className="text-xl font-bold">
            🗾 JGeo <span className="text-sm font-normal text-gray-400">- 日本版ジオゲッサー</span>
          </h1>
        </header>
      )}
      <main className="flex-1 min-h-0">
        {mode === 'select' && <ModeSelect onSelectMode={handleModeSelect} />}

        {mode === 'solo' && <Game onBack={handleBackToSelect} timeLimit={timeLimit} />}

        {mode === 'local' && (
          <LocalMultiGame players={localPlayers} onBack={handleBackToSelect} timeLimit={timeLimit} />
        )}

        {mode === 'online-lobby' && (
          <OnlineLobby
            roomState={ws.roomState}
            playerId={ws.playerId}
            roomId={ws.roomId}
            error={ws.error}
            onStartGame={() => ws.startGame(timeLimit)}
            onBack={handleBackToSelect}
          />
        )}

        {mode === 'online-game' && (
          <OnlineMultiGame
            playerId={ws.playerId}
            roomState={ws.roomState}
            gameState={ws.gameState}
            roundResult={ws.roundResult}
            gameEnd={ws.gameEnd}
            guessedInfo={ws.guessedInfo}
            onSubmitGuess={ws.submitGuess}
            onNextRound={ws.nextRound}
            onBack={handleBackToSelect}
          />
        )}
      </main>
    </div>
  );
}
