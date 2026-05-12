import { defineConfig } from "vite";

export default defineConfig({
  base: "/seattle-geodata-explorer/",
  optimizeDeps: {
    include: [
      "@arcgis/core/widgets/Search",
      "@arcgis/core/widgets/ScaleBar",
      "@arcgis/core/widgets/Measurement",
      "@arcgis/core/widgets/Compass"
    ]
  },
  define: {
    "process.env": {}      // <-- important for GitHub Pages
  },
  server: {
    fs: {
      strict: false
    }
  }
});