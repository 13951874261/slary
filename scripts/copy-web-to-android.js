/**
 * 将 Web 构建产物 (dist/) 复制到 Android assets/www/
 * 用法: node scripts/copy-web-to-android.js
 * 需先执行: npm run build
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const targetDir = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'www');

if (!fs.existsSync(distDir)) {
  console.error('[copy-web-to-android] dist/ 不存在，请先执行: npm run build');
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

try {
  for (const name of fs.readdirSync(distDir)) {
    copyRecursive(path.join(distDir, name), path.join(targetDir, name));
  }
  console.log('[copy-web-to-android] 已复制 dist/ -> android/app/src/main/assets/www/');
} catch (e) {
  console.error('[copy-web-to-android] 复制失败:', e.message);
  process.exit(1);
}
