import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    globalSetup: ["./testes/preparar-banco.ts"],
    setupFiles: ["./testes/limpar-banco.ts"],
    // Os testes compartilham um único banco real: rodam um arquivo por vez.
    fileParallelism: false,
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
