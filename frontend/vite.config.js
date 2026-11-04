import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    // Date grouping is checked as an Indian user sees it
    env: { TZ: "Asia/Kolkata" },
    coverage: { include: ["src/utils/**", "src/services/socket.js", "src/context/**"] },
  },
});
