#!/usr/bin/env bash
set -euo pipefail

# Initialize SSL certificate via Let's Encrypt for production deployment.
# Usage: ./scripts/init-ssl.sh leadflow.aldirifai.com you@example.com

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: $0 <domain> <email>"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> Stopping nginx if running..."
docker compose stop nginx 2>/dev/null || true

echo "==> Creating temporary HTTP-only nginx config for ACME challenge..."
mkdir -p docker/nginx/init
cat > docker/nginx/init/init.conf <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 200 'Leadflow SSL setup in progress';
    }
}
EOF

echo "==> Starting temporary nginx for ACME challenge..."
docker run -d --name leadflow-nginx-init \
  -p 80:80 \
  -v "$(pwd)/docker/nginx/init/init.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v leadflow_certbot-www:/var/www/certbot \
  nginx:1.27-alpine

sleep 3

echo "==> Requesting certificate from Let's Encrypt..."
docker run --rm \
  -v leadflow_certbot-conf:/etc/letsencrypt \
  -v leadflow_certbot-www:/var/www/certbot \
  certbot/certbot:latest \
  certonly --webroot -w /var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email \
  --non-interactive \
  -d "$DOMAIN"

echo "==> Cleaning up temporary nginx..."
docker stop leadflow-nginx-init && docker rm leadflow-nginx-init
rm -rf docker/nginx/init

echo "==> SSL setup complete. Now run: docker compose up -d"
