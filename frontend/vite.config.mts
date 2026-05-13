import { webcrypto } from 'node:crypto';
import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue2';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

const appEnvKeys = [
  'BASE_URL',
  'NODE_ENV',
  'VUE_APP_API_URL',
  'VUE_APP_DOMAIN',
  'VUE_APP_ENV',
  'VUE_APP_NAME',
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const baseUrl = env.BASE_URL || '/';
  const processEnv = {
    BASE_URL: baseUrl,
    NODE_ENV: mode === 'production' ? 'production' : 'development',
    VUE_APP_API_URL: env.VUE_APP_API_URL || '',
    VUE_APP_DOMAIN: env.VUE_APP_DOMAIN || 'localhost',
    VUE_APP_ENV: env.VUE_APP_ENV || mode,
    VUE_APP_NAME: env.VUE_APP_NAME || 'Zillion',
  };
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8000';

  return {
    base: baseUrl,
    envPrefix: ['VITE_', 'VUE_APP_'],
    plugins: [
      vue({
        template: {
          transformAssetUrls: {
            'v-img': ['src', 'lazy-src'],
            'v-card': 'src',
            'v-card-media': 'src',
            'v-responsive': 'src',
          },
        },
      }),
      VitePWA({
        filename: 'service-worker.js',
        injectRegister: false,
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        vue: 'vue/dist/vue.runtime.esm.js',
      },
      dedupe: ['vue', 'vuetify'],
    },
    define: Object.fromEntries(
      appEnvKeys.map((key) => [
        `process.env.${key}`,
        JSON.stringify(processEnv[key as keyof typeof processEnv]),
      ]),
    ),
    build: {
      minify: 'terser',
      sourcemap: false,
      terserOptions: {
        ecma: 5,
        compress: {
          keep_fnames: true,
        },
        mangle: {
          keep_fnames: true,
        },
      },
    },
    server: {
      port: 8080,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 8080,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/unit/**/*.spec.ts'],
      setupFiles: ['tests/unit/setup.ts'],
    },
  };
});
