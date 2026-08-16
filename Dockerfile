# syntax=docker/dockerfile:1
#
# JGeo 本番イメージ。docker/nginx.conf ＋ docker/supervisord.conf が前提とする構成に合わせる:
#   - nginx が /var/www/jgeo の静的ファイル（Vite ビルド成果物）を配信し、
#     /ws と /api/ を 127.0.0.1:3101 の Node サーバへプロキシする
#   - supervisord が nginx（/usr/sbin/nginx）と Node（/usr/local/bin/node index.js
#     を /app/server で実行）を並走させる
# 上記のパスは supervisord.conf にハードコードされているため、ベースは node 公式
# イメージ（/usr/local/bin/node を持つ）に nginx を足す形にしている。

# ---------- 1) フロントエンド（Vite）をビルド ----------
# Vite 7 は Node 20.19+ / 22.12+ を要求するため 22 系を使う。
FROM node:22-bookworm-slim AS frontend
WORKDIR /build

# 依存だけ先に入れてレイヤキャッシュを効かせる。
COPY package.json package-lock.json ./
RUN npm ci

# VITE_* は .env 経由でビルド時に埋め込まれる（CI が .env を生成してから build する）。
COPY . .
RUN npm run build

# ---------- 2) サーバの本番依存だけを解決 ----------
FROM node:22-bookworm-slim AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ---------- 3) 実行イメージ ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install --no-install-recommends -y nginx supervisor \
  && rm -rf /var/lib/apt/lists/* \
  # Debian 既定のサイト設定は conf.d の設定と衝突するため外す。
  && rm -f /etc/nginx/sites-enabled/default \
  && mkdir -p /var/log/supervisor /var/www/jgeo

# 静的ファイル（nginx の root）。
COPY --from=frontend /build/dist /var/www/jgeo

# Node サーバ本体と、その本番依存。
COPY server/ /app/server/
COPY --from=server-deps /app/server/node_modules /app/server/node_modules

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
