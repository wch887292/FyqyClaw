#!/usr/bin/env bash
# 本地 macOS 构建脚本（未签名 / 仅 x64，用于 VM 或本机自测，不出 Release）
# 用法：  ./scripts/build-mac-local.sh
set -e

# 关闭证书自动发现 -> 走 ad-hoc / 未签名，避免本机没有 Apple 证书时报错
export CSC_IDENTITY_AUTO_DISCOVERY=false

echo "==> 安装依赖（如尚未安装）"
npm install

echo "==> 构建 macOS (x64, 未签名)"
npm run build:mac:local

echo "==> 产物列表："
ls -lh release/ 2>/dev/null | grep -i mac || true

echo ""
echo "自测提示："
echo "  1) 双击 release/FyqyClaw-0.1.5-mac-x64.dmg 拖进 Applications；"
echo "  2) 若被 Gatekeeper 拦截，执行："
echo "       sudo xattr -rd com.apple.quarantine /Applications/FyqyClaw.app"
echo "     或右键 App -> 打开 -> 仍要打开。"
echo "  3) 未签名包无法上架 App Store / 无法公证分发，仅限本地功能验证。"
