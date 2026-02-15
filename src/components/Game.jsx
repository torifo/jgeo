import { useState, useCallback, useEffect, useRef } from 'react';
import PanoramaViewer from './PanoramaViewer';
import AnswerMap from './AnswerMap';
import ScoreDisplay from './ScoreDisplay';
import { calculateDistance, calculateScore } from '../utils/scoring';
import locations from '../data/locations.json';

const TOTAL_ROUNDS = 5;

function shuffleAndPick(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function Game({ onBack, timeLimit = 0 }) {
  const [gameLocations] = useState(() => shuffleAndPick(locations, TOTAL_ROUNDS));
  const [currentRound, setCurrentRound] = useState(0);
  const [guessPosition, setGuessPosition] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [gameFinished, setGameFinished] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const timerRef = useRef(null);

  const currentLocation = gameLocations[currentRound];

  // Timer logic
  useEffect(() => {
    if (timeLimit <= 0 || roundResult) {
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
  }, [currentRound, timeLimit, roundResult]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (timeLimit > 0 && timeRemaining === 0 && !roundResult) {
      handleTimeUp();
    }
  }, [timeRemaining]);

  const handleTimeUp = () => {
    if (roundResult) return;
    if (guessPosition) {
      // Auto-submit current guess
      const dist = calculateDistance(
        guessPosition.lat, guessPosition.lng,
        currentLocation.lat, currentLocation.lng
      );
      const score = calculateScore(dist);
      setRoundResult({ distance: dist, score });
      setTotalScore((prev) => prev + score);
    } else {
      // No guess = 0 points
      setRoundResult({ distance: null, score: 0, timedOut: true });
    }
  };

  const handleGuess = useCallback((pos) => {
    if (!roundResult) {
      setGuessPosition(pos);
    }
  }, [roundResult]);

  const handleSubmit = () => {
    if (!guessPosition || roundResult) return;
    clearInterval(timerRef.current);

    const dist = calculateDistance(
      guessPosition.lat, guessPosition.lng,
      currentLocation.lat, currentLocation.lng
    );
    const score = calculateScore(dist);

    setRoundResult({ distance: dist, score });
    setTotalScore((prev) => prev + score);
  };

  const handleNext = () => {
    if (currentRound + 1 >= TOTAL_ROUNDS) {
      setGameFinished(true);
    } else {
      setCurrentRound((prev) => prev + 1);
      setGuessPosition(null);
      setRoundResult(null);
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  if (gameFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <h1 className="text-4xl font-bold mb-4">ゲーム終了！</h1>
        <p className="text-6xl font-bold text-yellow-400 mb-8">{totalScore} 点</p>
        <p className="text-gray-400 mb-8">{TOTAL_ROUNDS} ラウンド中の合計スコア</p>
        <div className="flex gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg text-lg"
            >
              モード選択に戻る
            </button>
          )}
          <button
            onClick={handleRestart}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
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
          {roundResult && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded">
              正解: {currentLocation.prefecture}（{currentLocation.hint}）
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
              onGuess={handleGuess}
              disabled={!!roundResult}
              correctPosition={roundResult ? { lat: currentLocation.lat, lng: currentLocation.lng } : null}
              guessPosition={roundResult ? guessPosition : null}
            />
          </div>

          <div className="p-3 bg-gray-800 space-y-2">
            <ScoreDisplay
              distanceKm={roundResult?.distance ?? null}
              score={roundResult?.score ?? null}
              totalScore={totalScore}
              round={currentRound + 1}
              totalRounds={TOTAL_ROUNDS}
            />

            {roundResult?.timedOut && (
              <p className="text-center text-red-400 text-sm">時間切れ！ 0点</p>
            )}

            {!roundResult ? (
              <button
                onClick={handleSubmit}
                disabled={!guessPosition}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded"
              >
                回答する
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                {currentRound + 1 >= TOTAL_ROUNDS ? '結果を見る' : '次のラウンドへ'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
