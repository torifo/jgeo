# JGeo アーキテクチャ概要

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | React 19 + Vite |
| CSS | Tailwind CSS v4 |
| パノラマ表示 | Mapillary JS v4 |
| 回答用地図 | React-Leaflet + Leaflet |
| 地図タイル | 国土地理院標準地図 |
| 距離計算 | @turf/distance |

## 動作フロー

1. ゲーム開始時、47都道府県からランダムに5地点を選択
2. 各ラウンドで Mapillary パノラマを表示
3. プレイヤーが地図上をクリックして回答位置を指定
4. 「回答する」ボタンで確定 → 距離とスコアを計算
5. 正解地点と回答地点を線で結んで表示
6. 5ラウンド終了後、合計スコアを表示

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
└── Game（ゲーム状態管理）
    ├── PanoramaViewer（Mapillary パノラマ）
    ├── AnswerMap（Leaflet 回答地図）
    └── ScoreDisplay（スコア表示）
```

## 環境変数

| 変数名 | 説明 |
|--------|------|
| `VITE_MAPILLARY_CLIENT_TOKEN` | Mapillary API アクセストークン |

## 地図タイル

国土地理院標準地図タイルを使用:
```
https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png
```
