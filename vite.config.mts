import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";

export default defineConfig({
  define: {
    // Только статические переменные сборки
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    VitePluginNode({
      adapter: 'nest',
      appPath: './src/index.ts',
    })
  ],
  build: {
    target: 'node14',
    ssr: true,
    rollupOptions: {
      external: ['dotenv'],
    },
  },
});