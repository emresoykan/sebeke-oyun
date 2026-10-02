import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import { viteStaticCopy } from "vite-plugin-static-copy";

// CesiumJS: npm paketinin kaynak girişi ayrı bağımlılıklar ister; bunun yerine bağımsız hazır ESM
// paketini (Build/Cesium/index.js) kullan. Cesium çalışma zamanında worker, varlık ve stil dosyalarını
// CESIUM_BASE_URL altından yükler; bunları derlemeye "cesium/" klasörüne kopyala.
// CESIUM_LITE=1: dosya sayısı sınırlı yerler (önizleme) için kullanılmayan varlıkları dışarıda bırak.
const C = "node_modules/cesium/Build/Cesium";
const lite = process.env.CESIUM_LITE === "1";
const assets = lite
  ? ["Assets/Images", "Assets/IAU2006_XYS", "Assets/approximateTerrainHeights.json", "Assets/Textures/SkyBox", "Assets/Textures/moonSmall.jpg", "Assets/Textures/waterNormals.jpg", "Assets/Textures/waterNormalsSmall.jpg"]
  : ["Assets"];

export default defineConfig({
  resolve: { alias: [{ find: /^cesium$/, replacement: fileURLToPath(new URL(`./${C}/index.js`, import.meta.url)) }] },
  plugins: [viteStaticCopy({
    targets: [...assets, "Workers", "ThirdParty", "Widgets"].map(src => ({ src: `${C}/${src}`, dest: "cesium", rename: { stripBase: 4 } })),
  })],
  build: { chunkSizeWarningLimit: 6000 },
});
