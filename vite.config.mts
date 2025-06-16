import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePluginNode } from "vite-plugin-node";

export default defineConfig(({ mode }) => {
  // Загружаем env-переменные
  const envs = loadEnv(mode, process.cwd(), "");
  
  // Фильтруем только нужные префиксы (убираем VITE_)
  const processedEnvs = Object.keys(envs).reduce((acc, key) => {
    if (key.startsWith("VITE_")) {
      acc[key.slice(5)] = envs[key];
    } else {
      acc[key] = envs[key];
    }
    return acc;
  }, {});

  return {
    mode,
    define: {
      // Инжектим переменные в код при сборке
      "process.env": JSON.stringify({
        ...process.env,
        ...processedEnvs
      })
    },
    server: {
      hmr: true,
    },
    plugins: [
      VitePluginNode({
        appPath: "./src/",
        adapter: "nest"
      })
    ],
    build: {
      outDir: "dist",
      lib: {
        entry: resolve(__dirname, "src/index.ts"),
        fileName: "index",
        formats: ["cjs"]
      },
      // Важно для production
      ssr: true,
      emptyOutDir: true
    }
  };
});