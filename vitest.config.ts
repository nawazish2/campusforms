import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      { extends: true, test: { name: 'app', include: ['src/**/*.test.ts'] } },
      {
        // convex-test runs the backend functions in-process and needs the
        // edge runtime to match what Convex executes them in.
        extends: true,
        test: {
          name: 'convex',
          include: ['tests/convex/**/*.test.ts'],
          environment: 'edge-runtime',
          server: { deps: { inline: ['convex-test'] } },
        },
      },
    ],
  },
});
