import { defineConfig } from 'vite'
import { VitePluginNode } from 'vite-plugin-node'
import * as path from 'path'

export default defineConfig({
    server: {
        port: 3000
    },
    plugins: [
        ...VitePluginNode({
            adapter: 'fastify',
            appPath: './src/server.ts',
            exportName: 'viteNodeApp',
            tsCompiler: 'esbuild'
        })
    ],
    test: {},
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
})
