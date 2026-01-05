#!/bin/bash

# HTML5 Tower Defense - Frontend Setup Script

set -e

echo "🎮 HTML5 Tower Defense - Frontend Setup"
echo "========================================"
echo ""

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未找到"
    echo "请先运行: source ~/.zshrc"
    echo "然后重新运行此脚本"
    exit 1
fi

# 检查版本
NODE_VERSION=$(node --version)
echo "✅ Node.js 版本: $NODE_VERSION"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

echo ""
echo "✅ 前端项目设置完成！"
echo ""
echo "可用命令："
echo "  npm run dev       - 启动开发服务器"
echo "  npm run build     - 构建生产版本"
echo "  npm test          - 运行测试"
echo "  npm run lint      - 代码检查"
