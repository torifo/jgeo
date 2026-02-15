import { useState } from 'react';

const TIMER_OPTIONS = [
  { value: 0, label: 'なし' },
  { value: 15, label: '15秒' },
  { value: 30, label: '30秒' },
  { value: 60, label: '60秒' },
];

export default function ModeSelect({ onSelectMode }) {
  const [localPlayerCount, setLocalPlayerCount] = useState(2);
  const [localPlayerNames, setLocalPlayerNames] = useState(['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']);
  const [showLocalSetup, setShowLocalSetup] = useState(false);
  const [onlineAction, setOnlineAction] = useState(null); // 'create' | 'join'
  const [joinRoomId, setJoinRoomId] = useState('');
  const [onlinePlayerName, setOnlinePlayerName] = useState('');
  const [timeLimit, setTimeLimit] = useState(30);

  const handleLocalStart = () => {
    const players = localPlayerNames.slice(0, localPlayerCount).map((name, i) => ({
      id: i,
      name: name || `プレイヤー${i + 1}`,
    }));
    onSelectMode({ mode: 'local', players, timeLimit });
  };

  const handleOnlineCreate = () => {
    const name = onlinePlayerName.trim() || 'ゲスト';
    onSelectMode({ mode: 'online-lobby', action: 'create', playerName: name, timeLimit });
  };

  const handleOnlineJoin = () => {
    if (!joinRoomId.trim()) return;
    const name = onlinePlayerName.trim() || 'ゲスト';
    onSelectMode({ mode: 'online-lobby', action: 'join', roomId: joinRoomId.trim().toUpperCase(), playerName: name, timeLimit });
  };

  const TimerSelector = () => (
    <div className="mb-6">
      <label className="block text-sm text-gray-400 mb-2">制限時間</label>
      <div className="flex gap-2">
        {TIMER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTimeLimit(opt.value)}
            className={`px-3 py-2 rounded font-bold text-sm ${
              timeLimit === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  if (showLocalSetup) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <h2 className="text-3xl font-bold mb-8">ローカルマルチプレイ</h2>

        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">プレイヤー数</label>
          <div className="flex gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setLocalPlayerCount(n)}
                className={`px-4 py-2 rounded font-bold ${
                  localPlayerCount === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {n}人
              </button>
            ))}
          </div>
        </div>

        <TimerSelector />

        <div className="mb-8 w-full max-w-xs space-y-3">
          {Array.from({ length: localPlayerCount }).map((_, i) => (
            <div key={i}>
              <label className="block text-sm text-gray-400 mb-1">プレイヤー {i + 1}</label>
              <input
                type="text"
                value={localPlayerNames[i]}
                onChange={(e) => {
                  const names = [...localPlayerNames];
                  names[i] = e.target.value;
                  setLocalPlayerNames(names);
                }}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                placeholder={`プレイヤー${i + 1}`}
              />
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowLocalSetup(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg"
          >
            戻る
          </button>
          <button
            onClick={handleLocalStart}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            ゲーム開始
          </button>
        </div>
      </div>
    );
  }

  if (onlineAction !== null) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
        <h2 className="text-3xl font-bold mb-8">オンラインマルチプレイ</h2>

        <div className="mb-6 w-full max-w-xs">
          <label className="block text-sm text-gray-400 mb-1">あなたの名前</label>
          <input
            type="text"
            value={onlinePlayerName}
            onChange={(e) => setOnlinePlayerName(e.target.value)}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            placeholder="ゲスト"
          />
        </div>

        {onlineAction === 'create' && <TimerSelector />}

        {onlineAction === 'create' ? (
          <button
            onClick={handleOnlineCreate}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg mb-4"
          >
            ルームを作成
          </button>
        ) : (
          <div className="mb-4 w-full max-w-xs">
            <label className="block text-sm text-gray-400 mb-1">ルームID</label>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-3 tracking-widest text-center text-lg"
              placeholder="ABCDEF"
              maxLength={6}
            />
            <button
              onClick={handleOnlineJoin}
              disabled={!joinRoomId.trim()}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg"
            >
              ルームに参加
            </button>
          </div>
        )}

        <button
          onClick={() => setOnlineAction(null)}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg mt-2"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-8">
      <h2 className="text-4xl font-bold mb-2">JGeo</h2>
      <p className="text-gray-400 mb-12">日本版ジオゲッサー</p>

      <div className="space-y-4 w-full max-w-xs">
        <button
          onClick={() => onSelectMode({ mode: 'solo', timeLimit })}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg"
        >
          ソロプレイ
        </button>

        <button
          onClick={() => setShowLocalSetup(true)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-lg"
        >
          ローカルマルチ
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => setOnlineAction('create')}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-3 rounded-lg text-base"
          >
            ルーム作成
          </button>
          <button
            onClick={() => setOnlineAction('join')}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-3 rounded-lg text-base"
          >
            ルーム参加
          </button>
        </div>

        <TimerSelector />
      </div>
    </div>
  );
}
