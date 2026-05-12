import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";

export async function createLayerFromMetadata(meta) {
  const url = meta.url;

  if (meta.type.includes("Feature")) {
    return new FeatureLayer({
      url,
      title: meta.title,
      outFields: ["*"],
      popupEnabled: true
    });
  }

  if (meta.type.includes("Map Server") || meta.url.includes("MapServer")) {
    return new MapImageLayer({
      url,
      title: meta.title
    });
  }

  throw new Error(`Unsupported layer type: ${meta.type}`);
}