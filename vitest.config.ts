import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@signalbench/engine": fileURLToPath(new URL("./packages/engine/src/index.ts", import.meta.url)),
      "@signalbench/data": fileURLToPath(new URL("./packages/data/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    environment: "node",
  },
});
