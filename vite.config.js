import { defineConfig } from "vite";

// MapLibre v6 worker'ı ES modülü olarak çalışır; Vite'ın worker paketini de ES formatında üretmesi gerekir.
export default defineConfig({
  worker: { format: "es" },
});
