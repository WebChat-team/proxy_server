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
      // Добавляем поддержку process.env
      tsConfig: {
        compilerOptions: {
          target: "esnext",
          module: "esnext",
        },
      },
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