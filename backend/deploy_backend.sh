#!/bin/bash
# Menghentikan script jika ada perintah yang error
set -e

echo "🚀 Memulai Deployment backend..."

production_server="192.168.169.27"
ssh_user="ham" 

echo "📦 1. Membangun backend..."
pnpm run build

echo "🎨 2. Mentransfer data ke server .$production_server..."
sshpass -p "$ssh_password" rsync -avz --progress \
  ./src/ \
  ./prisma/ \
  ./package.json/ \
  $ssh_user@$production_server:/var/www/html/


echo "✅ Deployment backend selesai!"