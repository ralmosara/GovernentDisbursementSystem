// @ts-check
// Load .env into process.env so server code (DB connection, auth) sees it in dev
import 'dotenv/config';
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [vue({
    appEntrypoint: '/src/app'
  })],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: 4321,
    host: true
  }
});
