#!/bin/bash

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
cd "$SCRIPT_DIR"

BACKEND_PORT=8787

echo "=================================="
echo "  一键启动前后端"
echo "=================================="

# 清理旧端口
echo "🔍 清理端口 $BACKEND_PORT..."
lsof -t -i:$BACKEND_PORT 2>/dev/null | xargs kill -9 2>/dev/null
sleep 0.5

# 启动后端（后台）
echo "✅ 启动后端服务..."
export PYTHONPATH=$(pwd):$PYTHONPATH
python backend/run_server.py &
BACKEND_PID=$!

# 启动前端（后台）
echo "✅ 启动前端服务..."
cd app
npm run dev &
FRONTEND_PID=$!

# ==========================================
# 🔥 核心：Ctrl+C 一定会执行这里！
# ==========================================
trap '
echo -e "\n🛑 正在停止所有服务..."
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null
pkill -9 -f "python backend/run_server.py" 2>/dev/null
pkill -9 -f "vite" 2>/dev/null
echo "✅ 前后端已全部关闭"
exit 0
' INT

echo -e "\n⌨️  按 Ctrl+C 停止所有服务\n"

# 等待信号（这里才会捕获 Ctrl+C）
wait
