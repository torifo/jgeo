# JGeo - 日本版ジオゲッサー

日本全国47都道府県のストリートビュー画像から場所を当てる位置推測ゲーム。

## 機能

- **ソロプレイ** - 1人用、5ラウンド
- **ローカルマルチ** - 2〜4人、1台の端末で順番に回答
- **オンラインマルチ** - リンク共有で最大100人対戦（WebSocket）
- **タイマー** - なし / 15秒 / 30秒 / 60秒から選択

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フロントエンド | React 19 + Vite 7 |
| CSS | Tailwind CSS v4 |
| パノラマ表示 | Mapillary JS v4 |
| 回答用地図 | React-Leaflet + Leaflet |
| 地図タイル | 国土地理院標準地図 |
| 距離計算 | @turf/distance |
| サーバー | Express + ws (WebSocket) |

## ローカル開発

### 前提条件

- Node.js 20+
- Mapillary クライアントトークン ([取得方法](https://www.mapillary.com/developer))

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/torifo/jgeo.git
cd jgeo

# 環境変数を設定
cp .env.example .env
# .env を編集して VITE_MAPILLARY_CLIENT_TOKEN を設定

# フロントエンドの依存関係をインストール & 起動
npm install
npm run dev

# オンラインマルチを使う場合はサーバーも起動
cd server
npm install
npm run dev
```

フロントエンド: http://localhost:5173
サーバー: http://localhost:3101

## 環境変数

| 変数名 | 説明 | 例 |
|--------|------|----|
| `VITE_MAPILLARY_CLIENT_TOKEN` | Mapillary API トークン（必須） | `MLY\|...` |
| `VITE_WS_URL` | WebSocket接続先（オンラインマルチ用） | `ws://localhost:3101` |
| `VITE_API_URL` | APIサーバーURL（オンラインマルチ用） | `http://localhost:3101` |

## デプロイ

VPSへのデプロイ手順は [docs/deployment.md](docs/deployment.md) を参照。

## ライセンス

MIT
