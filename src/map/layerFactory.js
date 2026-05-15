import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import { getUnsupportedReason } from "../utils/catalogMetadata.js";

async function fetchServiceJson(url) {
  const response = await fetch(`${url.replace(/\/?$/, "")}?f=json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch service metadata: ${response.statusText}`);
  }
  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || "The service returned an error.");
  }
  return json;
}

function normalizedType(meta) {
  return (meta.type || "").toString().toLowerCase();
}

function normalizedUrl(meta) {
  return (meta.url || "").toString().trim();
}

function isFeatureService(meta) {
  const type = normalizedType(meta);
  const url = normalizedUrl(meta);
  return type.includes("feature") || /\/FeatureServer(\/\d+)?\/?$/i.test(url);
}

function isMapService(meta) {
  const type = normalizedType(meta);
  const url = normalizedUrl(meta);
  return (
    type.includes("map service") ||
    /\/MapServer\/?$/i.test(url) ||
    /\/MapServer\/\d+\/?$/i.test(url)
  );
}

function isVectorTileService(meta) {
  const type = normalizedType(meta);
  const url = normalizedUrl(meta);
  return type.includes("vector tile") || /\/VectorTileServer\/?$/i.test(url);
}

function isImageService(meta) {
  const type = normalizedType(meta);
  const url = normalizedUrl(meta);
  return type.includes("image service") || /\/ImageServer\/?$/i.test(url);
}

function tableInfos(url, tables = []) {
  return tables.map((table) => ({
    id: table.id,
    name: table.name,
    url: `${url.replace(/\/?$/, "")}/${table.id}`
  }));
}

export async function createLayerFromMetadata(meta) {
  const url = normalizedUrl(meta);
  if (!url) {
    throw new Error("This catalog item does not include a web service URL.");
  }

  if (isFeatureService(meta)) {
    let featureUrl = url;

    if (/\/FeatureServer\/?$/i.test(url)) {
      const service = await fetchServiceJson(url);
      if (service.layers && service.layers.length > 0) {
        featureUrl = `${url.replace(/\/?$/, "")}/${service.layers[0].id}`;
      } else if (service.tables && service.tables.length > 0) {
        return {
          tables: tableInfos(url, service.tables)
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

  if (isMapService(meta)) {
    const mapUrl = url.replace(/\/\d+\/?$/, "");
    return {
      layer: new MapImageLayer({
        url: mapUrl,
        title: meta.title
      })
    };
  }

  if (isVectorTileService(meta)) {
    return {
      layer: new VectorTileLayer({
        url,
        title: meta.title
      })
    };
  }

  if (isImageService(meta)) {
    return {
      layer: new ImageryLayer({
        url,
        title: meta.title
      })
    };
  }

  throw new Error(getUnsupportedReason(meta) || `Unsupported layer type: ${meta.type || "Unknown"}`);
}
