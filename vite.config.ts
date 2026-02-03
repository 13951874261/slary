import { viteSingleFile } from 'vite-plugin-singlefile';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  // 相对路径，便于部署到 Android assets (file:///android_asset/www/) 时正确加载资源
  base: './',
  server: {
    host: true,
  },
});
