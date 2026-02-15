import { useState, useCallback, useEffect, useRef } from 'react';
import PanoramaViewer from './PanoramaViewer';
import AnswerMap from './AnswerMap';
import { calculateDistance, calculateScore } from '../utils/scoring';
import locations from '../data/locations.json';

const TOTAL_ROUNDS = 5;

const PLAYER_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b'];

function shuffleAndPick(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function LocalMultiGame({ players, onBack, timeLimit = 0 }) {
  const [gameLocations] = useState(() => shuffleAndPick(locations, TOTAL_ROUNDS));
  const [currentRound, setCurrentRound] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [guessPosition, setGuessPosition] = useState(null);
  const [playerGuesses, setPlayerGuesses] = useState([]);
  const [roundResults, setRoundResults] = useState(null);
  const [playerScores, setPlayerScores] = useState(() => players.map(() => 0));
  const [gameFinished, setGameFinished] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const timerRef = useRef(null);
  const guessRef = useRef(null);

  const currentLocation = gameLocations[currentRound];
  const currentPlayer = players[currentPlayerIndex];

  // Keep guessRef in sync
  useEffect(() => {
    guessRef.current = guessPosition;
  }, [guessPosition]);

  // Timer logic - resets per player turn
  useEffect(() => {
    if (timeLimit <= 0 || roundResults) {
      clearInterval(timerRef.current);
      return;
    }
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
  }, [currentRound, currentPlayerIndex, timeLimit, roundResults]);

  // Auto-submit on timeout
  useEffect(() => {
    if (timeLimit > 0 && timeRemaining === 0 && !roundResults) {
      handleTimeUp();
    }
  }, [timeRemaining]);

  const handleTimeUp = () => {
    if (roundResults) return;
    const pos = guessRef.current;
    if (pos) {
      submitGuess(pos);
    } else {
      // No guess = 0 points, skip this player
      const guess = {
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        position: { lat: 0, lng: 0 },
        distance: null,
        score: 0,
        timedOut: true,
      };
      advanceAfterGuess(guess);
    }
  };

  const submitGuess = (pos) => {
    const dist = calculateDistance(
      pos.lat, pos.lng,
      currentLocation.lat, currentLocation.lng
    );
    const score = calculateScore(dist);

    const guess = {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      position: pos,
      distance: dist,
      score,
    };
    advanceAfterGuess(guess);
  };

  const advanceAfterGuess = (guess) => {
    clearInterval(timerRef.current);
    const updatedGuesses = [...playerGuesses, guess];
    setPlayerGuesses(updatedGuesses);

    if (currentPlayerIndex + 1 < players.length) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
      setGuessPosition(null);
      setMapKey((k) => k + 1);
    } else {
      const newScores = [...playerScores];
      updatedGuesses.forEach((g) => {
        const idx = players.findIndex((p) => p.id === g.playerId);
        newScores[idx] += g.score;
      });
      setPlayerScores(newScores);
      setRoundResults(updatedGuesses);
    }
  };

  const handleGuess = useCallback((pos) => {
    if (!roundResults) {
      setGuessPosition(pos);
    }
  }, [roundResults]);

  const handleSubmit = () => {
    if (!guessPosition) return;
    clearInterval(timerRef.current);
    submitGuess(guessPosition);
  };

  const handleNextRound = () => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setGameFinished(true);
    } else {
      setCurrentRound((r) => r + 1);
      setCurrentPlayerIndex(0);
      setGuessPosition(null);
      setPlayerGuesses([]);
      setRoundResults(null);
      setMapKey((k) => k + 1);
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  if (gameFinished) {
    const rankings = players
      .map((p, i) => ({ ...p, score: playerScores[i] }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <h1 className="text-4xl font-bold mb-8">最終結果</h1>
        <div className="w-full max-w-md space-y-3 mb-8">
          {rankings.map((p, rank) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-4 rounded-lg ${
                rank === 0 ? 'bg-yellow-600/30 border border-yellow-500' : 'bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-400">{rank + 1}</span>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PLAYER_COLORS[players.findIndex((pp) => pp.id === p.id)] }}
                />
                <span className="font-bold text-lg">{p.name}</span>
              </div>
              <span className="text-2xl font-bold text-yellow-400">{p.score}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
          >
            モード選択に戻る
          </button>
          <button
            onClick={handleRestart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            もう一度プレイ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* パノラマビューエリア */}
        <div className="flex-1 min-h-0 relative">
          <PanoramaViewer location={currentLocation} />
          {!roundResults && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg">
              <span
                className="font-bold"
                style={{ color: PLAYER_COLORS[currentPlayerIndex] }}
              >
                {currentPlayer.name}
              </span>
              <span className="text-gray-300"> の番です</span>
            </div>
          )}
          {roundResults && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded">
              正解: {currentLocation.prefecture}（{currentLocation.hint}）
            </div>
          )}
          {timeLimit > 0 && !roundResults && (
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
            {roundResults ? (
              <AnswerMap
                key={`result-${currentRound}`}
                onGuess={() => {}}
                disabled={true}
                correctPosition={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                guessPosition={roundResults[0]?.position}
                extraMarkers={roundResults.filter((g) => !g.timedOut).map((g) => ({
                  position: g.position,
                  color: PLAYER_COLORS[players.findIndex((p) => p.id === g.playerId)],
                  label: g.playerName,
                }))}
              />
            ) : (
              <AnswerMap
                key={`play-${mapKey}`}
                onGuess={handleGuess}
                disabled={false}
                correctPosition={null}
                guessPosition={null}
              />
            )}
          </div>

          <div className="p-3 bg-gray-800 space-y-2">
            {/* ラウンド情報 */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">
                ラウンド {currentRound + 1} / {TOTAL_ROUNDS}
              </span>
              <div className="flex gap-2">
                {players.map((p, i) => (
                  <span key={p.id} className="text-xs" style={{ color: PLAYER_COLORS[i] }}>
                    {p.name}: {playerScores[i]}
                  </span>
                ))}
              </div>
            </div>

            {roundResults ? (
              <>
                {/* ラウンド結果表示 */}
                <div className="space-y-1">
                  {[...roundResults]
                    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
                    .map((g) => {
                      const pidx = players.findIndex((p) => p.id === g.playerId);
                      return (
                        <div key={g.playerId} className="flex justify-between text-sm">
                          <span style={{ color: PLAYER_COLORS[pidx] }}>{g.playerName}</span>
                          <span className="text-gray-300">
                            {g.timedOut ? (
                              <span className="text-red-400">時間切れ (0点)</span>
                            ) : (
                              <>{g.distance.toFixed(1)} km / <span className="text-green-400">+{g.score}</span></>
                            )}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <button
                  onClick={handleNextRound}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  {currentRound + 1 >= TOTAL_ROUNDS ? '最終結果を見る' : '次のラウンドへ'}
                </button>
              </>
            ) : (
              <>
                <div className="text-center text-sm text-gray-400">
                  回答: {currentPlayerIndex + 1} / {players.length} 人目
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!guessPosition}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded"
                >
                  回答する（{currentPlayer.name}）
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
