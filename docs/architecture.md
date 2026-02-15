# JGeo アーキテクチャ概要

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React 19 + Vite 7 |
| CSS | Tailwind CSS v4 |
| パノラマ表示 | Mapillary JS v4 |
| 回答用地図 | React-Leaflet + Leaflet |
| 地図タイル | 国土地理院標準地図 |
| 距離計算 | @turf/distance |
| サーバー | Express + ws (WebSocket) |
| ルームID生成 | nanoid |

## ゲームモード

### ソロプレイ
クライアント完結。`locations.json` からランダムに5地点を選択し、順番にプレイ。

### ローカルマルチ
1台の端末で2〜4人が順番に回答。各プレイヤーの回答後に次のプレイヤーへ交代。

### オンラインマルチ
WebSocketサーバーを介したリアルタイム対戦。

```
クライアント A ──┐
クライアント B ──┼── WebSocket ── Express サーバー (port 3101)
クライアント C ──┘                  │
                              locations.json
                            (サーバー側で管理)
```

- ルーム作成 → ルームID発行 → リンク共有で参加
- サーバーが `locations.json` を直接読み込み（不正防止）
- タイマーはサーバー側で権威的に管理（+1秒バッファ）

## 動作フロー

1. モード選択画面でゲームモード・タイマーを設定
2. ゲーム開始時、5地点をランダム選択（オンラインはサーバーが選択）
3. 各ラウンドで Mapillary パノラマ画像を表示
4. プレイヤーが地図上をクリックして回答位置を指定
5. 「回答する」ボタンで確定 → 距離とスコアを計算
6. 正解地点と回答地点を線で結んで表示
7. 5ラウンド終了後、合計スコアを表示

## スコア計算

```
score = 5000 × e^(-distance / 2000)
```

- 距離0km → 5000点（満点）
- 距離100km → 約4756点
- 距離500km → 約3894点
- 距離1000km → 約3033点
- 距離2000km → 約1839点

## コンポーネント構成

```
App
├── Header（タイトル表示）
├── ModeSelect（モード・タイマー選択）
├── Game（ソロプレイ）
│   ├── PanoramaViewer（Mapillary パノラマ）
│   ├── AnswerMap（Leaflet 回答地図）
│   └── ScoreDisplay（スコア表示）
├── LocalMultiGame（ローカルマルチ）
├── OnlineLobby（オンラインロビー）
└── OnlineMultiGame（オンライン対戦）
```

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `VITE_MAPILLARY_CLIENT_TOKEN` | Mapillary API アクセストークン |
| `VITE_WS_URL` | WebSocket 接続先URL |
| `VITE_API_URL` | API サーバーURL |

## 地図タイル

国土地理院標準地図タイルを使用:
```
https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png
```
