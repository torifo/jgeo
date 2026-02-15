import { useState } from 'react';

export default function OnlineLobby({ roomState, playerId, roomId, error, onStartGame, onBack }) {
  const [copied, setCopied] = useState(false);

  const isHost = roomState?.hostId === playerId;
  const players = roomState?.players || [];
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
      <h2 className="text-3xl font-bold mb-6">オンラインロビー</h2>

      {error && (
        <div className="bg-red-600/30 border border-red-500 text-red-300 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Room ID */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6 w-full max-w-md text-center">
        <p className="text-sm text-gray-400 mb-2">ルームID</p>
        <p className="text-4xl font-mono font-bold tracking-widest text-yellow-400 mb-4">{roomId}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={handleCopyRoomId}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded"
          >
            {copied ? 'コピーしました' : 'IDをコピー'}
          </button>
          <button
            onClick={handleCopyLink}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded"
          >
            リンクをコピー
          </button>
        </div>
      </div>

      {/* Player list */}
      <div className="w-full max-w-md mb-6">
        <p className="text-sm text-gray-400 mb-2">参加者 ({players.length}人)</p>
        <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
          {players.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="font-medium">{p.name}</span>
                {p.id === playerId && <span className="text-xs text-gray-500">(あなた)</span>}
              </div>
              {p.id === roomState?.hostId && (
                <span className="text-xs bg-yellow-600/30 text-yellow-400 px-2 py-0.5 rounded">ホスト</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
        >
          退出
        </button>
        {isHost && (
          <button
            onClick={onStartGame}
            disabled={players.length < 1}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg"
          >
            ゲーム開始
          </button>
        )}
        {!isHost && (
          <p className="text-gray-400 self-center">ホストがゲームを開始するのを待っています...</p>
        )}
      </div>
    </div>
  );
}
