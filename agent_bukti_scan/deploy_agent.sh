#!/bin/bash
echo "🚀 Memulai Deployment BuktiScan..."

echo "📦 1. Membangun Backend..."
cd backend
npm install --legacy-peer-deps
npm run build
cd ..

echo "🎨 2. Membangun Frontend..."
cd frontend
npm install --legacy-peer-deps
npm run build
cd ..

echo "🔄 3. Merestart Layanan PM2..."
pm2 startOrReload ecosystem.config.cjs || pm2 start ecosystem.config.cjs

echo "✅ Deployment selesai dan berhasil diterapkan!"
