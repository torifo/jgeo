export default function ScoreDisplay({ distanceKm, score, totalScore, round, totalRounds }) {
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-400">
          ラウンド {round} / {totalRounds}
        </span>
        <span className="text-sm text-gray-400">
          合計スコア: <span className="text-yellow-400 font-bold">{totalScore}</span>
        </span>
      </div>
      {distanceKm !== null && (
        <div className="text-center">
          <p className="text-lg">
            距離: <span className="font-bold text-blue-400">{distanceKm.toFixed(1)} km</span>
          </p>
          <p className="text-2xl mt-1">
            スコア: <span className="font-bold text-green-400">+{score}</span>
          </p>
        </div>
      )}
    </div>
  );
}
