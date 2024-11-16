import { resolve } from "path";
import { defineConfig, loadEnv } from "vite";
import { VitePluginNode } from "vite-plugin-node";

function getEnvs(mode: string) {

    const envs = loadEnv(mode, process.cwd());

    for (let nameEnv in envs) {
        envs[nameEnv.slice(5)] = envs[nameEnv];
        delete envs[nameEnv];
    }

    return envs;

}

export default function ({ mode }) {

    process.env = { ...process.env, ...getEnvs(mode) }

    return defineConfig({

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
            }
        },
    
    });

}