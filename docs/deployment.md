# VPS デプロイ手順

nginx + certbot が稼働中のVPSへのデプロイ手順。

## 前提条件

- Ubuntu / Debian 系 VPS
- nginx インストール済み
- certbot (Let's Encrypt) で SSL 証明書取得済み
- Node.js 20+ インストール済み
- git インストール済み

## 1. クローン & ビルド

```bash
cd /var/www
git clone https://github.com/torifo/jgeo.git
cd jgeo

# 環境変数を設定
cp .env.example .env
nano .env
```

`.env` の設定例:

```
VITE_MAPILLARY_CLIENT_TOKEN=MLY|xxxxxxxxxxxx
VITE_WS_URL=wss://jgeo.example.com/ws
VITE_API_URL=https://jgeo.example.com
```

> `VITE_` 変数はビルド時に埋め込まれるため、ビルド前に設定すること。

```bash
# フロントエンドビルド
npm install
npm run build

# サーバー依存関係インストール
cd server
npm install
cd ..
```

## 2. systemd サービス

`/etc/systemd/system/jgeo-server.service`:

```ini
[Unit]
Description=JGeo WebSocket Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/jgeo/server
ExecStart=/usr/bin/node index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable jgeo-server
sudo systemctl start jgeo-server

# 状態確認
sudo systemctl status jgeo-server
```

## 3. nginx 設定

`/etc/nginx/sites-available/jgeo`:

```nginx
server {
    listen 80;
    server_name jgeo.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name jgeo.example.com;

    ssl_certificate /etc/letsencrypt/live/jgeo.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/jgeo.example.com/privkey.pem;

    # フロントエンド静的ファイル
    root /var/www/jgeo/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API プロキシ
    location /api/ {
        proxy_pass http://127.0.0.1:3101;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket プロキシ
    location /ws {
        proxy_pass http://127.0.0.1:3101;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/jgeo /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 4. SSL 証明書（未取得の場合）

```bash
sudo certbot --nginx -d jgeo.example.com
```

## 5. 更新手順

```bash
cd /var/www/jgeo
git pull

# フロントエンド再ビルド
npm install
npm run build

# サーバー更新
cd server
npm install
cd ..
sudo systemctl restart jgeo-server
```
