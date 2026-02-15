import { useState, useCallback, useEffect, useRef } from 'react';
import PanoramaViewer from './PanoramaViewer';
import AnswerMap from './AnswerMap';

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

export default function OnlineMultiGame({
  playerId,
  roomState,
  gameState,
  roundResult,
  gameEnd,
  guessedInfo,
  onSubmitGuess,
  onNextRound,
  onBack,
}) {
  const [guessPosition, setGuessPosition] = useState(null);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef(null);
  const guessRef = useRef(null);

  const isHost = roomState?.hostId === playerId;
  const players = roomState?.players || [];
  const timeLimit = gameState?.timeLimit || 0;

  // Keep guessRef in sync
  useEffect(() => {
    guessRef.current = guessPosition;
  }, [guessPosition]);

  // Timer: start on each new round
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!gameState || timeLimit <= 0 || roundResult) return;

    setTimeRemaining(timeLimit);
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gameState?.round, timeLimit, roundResult]);

  // Auto-submit on local timeout (server also enforces)
  useEffect(() => {
    if (timeLimit > 0 && timeRemaining === 0 && !hasGuessed && !roundResult) {
      const pos = guessRef.current;
      if (pos) {
        onSubmitGuess(pos.lat, pos.lng);
      }
      // Server will handle 0-point for no guess
      setHasGuessed(true);
    }
  }, [timeRemaining]);

  // Reset hasGuessed when new round starts
  useEffect(() => {
    setHasGuessed(false);
    setGuessPosition(null);
  }, [gameState?.round]);

  const handleGuess = useCallback((pos) => {
    if (!hasGuessed && !roundResult) {
      setGuessPosition(pos);
    }
  }, [hasGuessed, roundResult]);

  const handleSubmit = () => {
    if (!guessPosition || hasGuessed) return;
    clearInterval(timerRef.current);
    onSubmitGuess(guessPosition.lat, guessPosition.lng);
    setHasGuessed(true);
  };

  const handleNextRound = () => {
    onNextRound();
  };

  // Game end screen
  if (gameEnd) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <h1 className="text-4xl font-bold mb-8">最終結果</h1>
        <div className="w-full max-w-md space-y-3 mb-8">
          {gameEnd.finalScores.map((p, rank) => (
            <div
              key={p.playerId}
              className={`flex items-center justify-between p-4 rounded-lg ${
                rank === 0 ? 'bg-yellow-600/30 border border-yellow-500' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-400">{rank + 1}</span>
                <span className="font-bold text-lg">{p.playerName}</span>
                {p.playerId === playerId && <span className="text-xs text-gray-500">(あなた)</span>}
              </div>
              <span className="text-2xl font-bold text-yellow-400">{p.totalScore}</span>
            </div>
          ))}
        </div>
        <button
          onClick={onBack}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg"
        >
          モード選択に戻る
        </button>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-white">
        <p>ゲームデータを読み込み中...</p>
      </div>
    );
  }

  const location = gameState.location;
  const extraMarkers = roundResult
    ? roundResult.results.filter((r) => !r.timedOut).map((r, i) => ({
        position: { lat: r.lat, lng: r.lng },
        color: PLAYER_COLORS[i % PLAYER_COLORS.length],
        label: r.playerName,
      }))
    : [];

  const correctPos = roundResult
    ? { lat: roundResult.location.lat, lng: roundResult.location.lng }
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* パノラマビューエリア */}
        <div className="flex-1 min-h-0 relative">
          <PanoramaViewer location={location} />
          {roundResult && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded">
              正解: {roundResult.location.prefecture}（{roundResult.location.hint}）
            </div>
          )}
          {hasGuessed && !roundResult && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded">
              回答送信済み — 他のプレイヤーを待っています...
              {guessedInfo && (
                <span className="ml-2 text-yellow-400">
                  ({guessedInfo.guessedCount}/{guessedInfo.totalPlayers}人回答済み)
                </span>
              )}
            </div>
          )}
          {timeLimit > 0 && !roundResult && (
            <div className={`absolute top-4 right-4 px-4 py-2 rounded-lg font-bold text-xl ${
              timeRemaining <= 5 ? 'bg-red-600/90 text-white animate-pulse' : 'bg-black/70 text-white'
            }`}>
              {timeRemaining}秒
            </div>
          )}
        </div>

        {/* 地図エリア */}
        <div className="w-full lg:w-[400px] h-[300px] lg:h-auto flex flex-col">
          <div className="flex-1 min-h-0">
            <AnswerMap
              key={`round-${gameState.round}-${roundResult ? 'result' : 'play'}`}
              onGuess={handleGuess}
              disabled={hasGuessed || !!roundResult}
              correctPosition={correctPos}
              guessPosition={roundResult ? guessPosition : null}
              extraMarkers={extraMarkers}
            />
          </div>

          <div className="p-3 bg-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">
                ラウンド {(gameState.round || 0) + 1} / {gameState.totalRounds || 5}
              </span>
              <span className="text-sm text-gray-400">
                {players.length}人参加中
              </span>
            </div>

            {roundResult ? (
              <>
                <div className="space-y-1">
                  {roundResult.results.map((r, i) => (
                    <div key={r.playerId} className="flex justify-between text-sm">
                      <span style={{ color: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
                        {r.playerName}
                        {r.playerId === playerId && ' (あなた)'}
                      </span>
                      <span className="text-gray-300">
                        {r.timedOut ? (
                          <span className="text-red-400">時間切れ (0点)</span>
                        ) : (
                          <>{r.distance.toFixed(1)} km / <span className="text-green-400">+{r.score}</span></>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {isHost ? (
                  <button
                    onClick={handleNextRound}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    {(gameState.round || 0) + 1 >= (gameState.totalRounds || 5) ? '最終結果を見る' : '次のラウンドへ'}
                  </button>
                ) : (
                  <p className="text-center text-sm text-gray-400">ホストが次のラウンドを開始するのを待っています...</p>
                )}
              </>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!guessPosition || hasGuessed}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded"
              >
                {hasGuessed ? '回答済み' : '回答する'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
