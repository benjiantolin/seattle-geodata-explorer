import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";

async function fetchServiceJson(url) {
  const response = await fetch(`${url.replace(/\/?$/, "")}?f=json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch service metadata: ${response.statusText}`);
  }
  return response.json();
}

export async function createLayerFromMetadata(meta) {
  const url = meta.url;

  if (meta.type.includes("Feature")) {
    let featureUrl = url;

    if (/\/FeatureServer\/?$/i.test(url)) {
      const service = await fetchServiceJson(url);
      if (service.layers && service.layers.length > 0) {
        featureUrl = `${url.replace(/\/?$/, "")}/${service.layers[0].id}`;
      } else if (service.tables && service.tables.length > 0) {
        return {
          tables: service.tables.map((table) => ({
            id: table.id,
            name: table.name,
            url: `${url.replace(/\/?$/, "")}/${table.id}`
          }))
        };
      } else {
        throw new Error("No displayable feature layer was found for this service.");
      }
    }

    return {
      layer: new FeatureLayer({
        url: featureUrl,
        title: meta.title,
        outFields: ["*"],
        popupEnabled: true
      })
    };
  }

  if (meta.type.includes("Map Server") || meta.url.includes("MapServer")) {
    return {
      layer: new MapImageLayer({
        url,
        title: meta.title
      })
    };
  }

  throw new Error(`Unsupported layer type: ${meta.type}`);
}