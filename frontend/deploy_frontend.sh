#!/bin/bash
# Menghentikan script jika ada perintah yang error
set -e

echo "🚀 Memulai Deployment frontend..."

production_server="192.168.169.27"
ssh_user="ham" 

echo "📦 1. Membangun frontend..."
pnpm run build

echo "🎨 2. Mentransfer data ke server .$production_server..."
sshpass -p "$ssh_password" rsync -avz --progress \
  ./dist/downloads/ \
  ./dist/assets/ \
  ./dist/index.html \
  $ssh_user@$production_server:/var/www/html/


echo "✅ Deployment frontend selesai!"