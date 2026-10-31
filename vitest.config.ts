import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    // a screen's first test pays a cold start (~0.8 s: first render of the screen and the router); with the
    // whole suite in parallel and the emulators running, that crossed the 5 s default now and then
    testTimeout: 15000,
  },
})
