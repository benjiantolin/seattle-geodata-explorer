import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import ImageryLayer from "@arcgis/core/layers/ImageryLayer";
import Layer from "@arcgis/core/layers/Layer";
import MapImageLayer from "@arcgis/core/layers/MapImageLayer";
import TileLayer from "@arcgis/core/layers/TileLayer";
import VectorTileLayer from "@arcgis/core/layers/VectorTileLayer";
import { getUnsupportedReason } from "../utils/catalogMetadata.js";

const serviceJsonCache = new Map();

async function fetchServiceJson(url) {
  const serviceUrl = url.replace(/\/?$/, "");
  if (serviceJsonCache.has(serviceUrl)) {
    return serviceJsonCache.get(serviceUrl);
  }

  const response = await fetch(`${serviceUrl}?f=json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch service metadata: ${response.statusText}`);
  }
  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message || "The service returned an error.");
  }
  serviceJsonCache.set(serviceUrl, json);
  return json;
}

function normalizedType(meta) {
  return (meta.type || "").toString().toLowerCase();
}

function normalizedUrl(meta) {
  return (meta.url || "").toString().trim();
}

function normalizedTitle(meta) {
  return (meta.title || "Untitled dataset").toString().trim();
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

function isGroupLayer(meta) {
  const type = normalizedType(meta);
  return type.includes("group layer") || type === "group";
}

function isCachedMapService(service = {}) {
  return service.singleFusedMapCache === true || Boolean(service.tileInfo);
}

function serviceRoot(url, serviceName) {
  const match = url.match(new RegExp(`^(.*\\/${serviceName})(?:\\/\\d+)?\\/?$`, "i"));
  return match ? match[1] : url.replace(/\/?$/, "");
}

function sublayerIdFromUrl(url, serviceName) {
  const match = url.match(new RegExp(`\\/${serviceName}\\/(\\d+)\\/?$`, "i"));
  return match ? Number(match[1]) : null;
}

function tableInfos(url, tables = []) {
  return tables.map((table) => ({
    id: table.id,
    name: table.name || `Table ${table.id}`,
    title: table.name || `Table ${table.id}`,
    url: `${url.replace(/\/?$/, "")}/${table.id}`,
    type: "Table",
    parentUrl: url.replace(/\/?$/, ""),
    serviceType: "FeatureServer",
    supportsTable: true,
  }));
}

function featureLayerChoices(meta, rootUrl, layers = []) {
  return layers.map((layer) => ({
    id: layer.id,
    name: layer.name || `Layer ${layer.id}`,
    title: `${normalizedTitle(meta)} - ${layer.name || `Layer ${layer.id}`}`,
    url: `${rootUrl.replace(/\/?$/, "")}/${layer.id}`,
    type: layer.type || "Feature Layer",
    parentTitle: normalizedTitle(meta),
    parentUrl: rootUrl.replace(/\/?$/, ""),
    serviceType: "FeatureServer",
    sublayerId: layer.id,
    defaultVisibility: layer.defaultVisibility !== false,
    supportsTable: true,
    loadStrategy: "feature-sublayer",
  }));
}

function createFeatureLayer(meta, url, title = normalizedTitle(meta)) {
  return new FeatureLayer({
    url,
    title,
    outFields: ["*"],
    popupEnabled: true,
  });
}

function createMapLayer(meta, url, service, sublayerId = null) {
  if (isCachedMapService(service)) {
    return {
      layer: new TileLayer({
        url,
        title: normalizedTitle(meta),
      }),
      supportsTable: false,
      source: "TileLayer",
      warning:
        sublayerId !== null
          ? "This cached MapServer uses a full service cache, so the full cached service may load instead of only the selected sublayer."
          : "",
    };
  }

  return {
    layer: new MapImageLayer({
      url,
      title: sublayerId !== null ? `${normalizedTitle(meta)} - Sublayer ${sublayerId}` : normalizedTitle(meta),
      sublayers:
        sublayerId !== null
          ? [
              {
                id: sublayerId,
                visible: true,
              },
            ]
          : undefined,
    }),
    supportsTable: false,
    source: "MapImageLayer",
  };
}

async function createGroupLayerFromPortalItem(meta) {
  if (!meta.id) {
    throw new Error(
      "This group layer needs a Portal item ID so the configured group layer can be loaded.",
    );
  }

  let layer;
  try {
    layer = await Layer.fromPortalItem({
      portalItem: {
        id: meta.id,
      },
    });
  } catch (error) {
    const detail = error?.message ? ` Detail: ${error.message}` : "";
    throw new Error(
      `This group layer could not be loaded from its Portal item. The item may not be publicly accessible, may require a specific Portal context, or may not be loadable as a layer through the ArcGIS Maps SDK.${detail}`,
    );
  }

  layer.title = layer.title || normalizedTitle(meta);
  return {
    layer,
    supportsTable: false,
    source: "Portal item",
  };
}

export async function createLayerFromLayerChoice(meta, layerInfo) {
  if (!layerInfo) {
    throw new Error("No layer choice was selected.");
  }

  if (layerInfo.serviceType === "FeatureServer") {
    return {
      layer: createFeatureLayer(meta, layerInfo.url, layerInfo.title),
      supportsTable: true,
      source: "FeatureLayer",
    };
  }

  if (layerInfo.serviceType === "MapServer") {
    const rootUrl = layerInfo.parentUrl || serviceRoot(layerInfo.url, "MapServer");
    const service = await fetchServiceJson(rootUrl);
    const result = createMapLayer(meta, rootUrl, service, layerInfo.sublayerId);
    result.layer.title = layerInfo.title || result.layer.title;
    return result;
  }

  throw new Error(`Unsupported layer choice type: ${layerInfo.serviceType || "Unknown"}`);
}

export async function createLayerFromMetadata(meta) {
  const url = normalizedUrl(meta);

  if (isGroupLayer(meta)) {
    return createGroupLayerFromPortalItem(meta);
  }

  if (!url) {
    throw new Error("This catalog item does not include a web service URL.");
  }

  if (isFeatureService(meta)) {
    if (/\/FeatureServer\/\d+\/?$/i.test(url)) {
      return {
        layer: createFeatureLayer(meta, url),
        supportsTable: true,
        source: "FeatureLayer",
      };
    }

    if (/\/FeatureServer\/?$/i.test(url)) {
      const service = await fetchServiceJson(url);
      const layers = service.layers || [];
      const tables = tableInfos(url, service.tables || []);

      if (layers.length > 1) {
        return {
          layerChoices: featureLayerChoices(meta, url, layers),
          tables,
          message: "Choose which feature layer to load.",
        };
      }

      if (layers.length === 1) {
        const layerInfo = featureLayerChoices(meta, url, layers)[0];
        return {
          layer: createFeatureLayer(meta, layerInfo.url, layerInfo.title),
          tables,
          supportsTable: true,
          source: "FeatureLayer",
        };
      }

      if (tables.length) {
        return { tables };
      }

      throw new Error("No displayable feature layers or tables were found for this service.");
    }

    return {
      layer: createFeatureLayer(meta, url),
      supportsTable: true,
      source: "FeatureLayer",
    };
  }

  if (isMapService(meta)) {
    const sublayerId = sublayerIdFromUrl(url, "MapServer");
    const mapUrl = serviceRoot(url, "MapServer");
    const service = await fetchServiceJson(mapUrl);
    return createMapLayer(meta, mapUrl, service, sublayerId);
  }

  if (isVectorTileService(meta)) {
    return {
      layer: new VectorTileLayer({
        url,
        title: normalizedTitle(meta),
      }),
      supportsTable: false,
      source: "VectorTileLayer",
    };
  }

  if (isImageService(meta)) {
    return {
      layer: new ImageryLayer({
        url,
        title: normalizedTitle(meta),
      }),
      supportsTable: false,
      source: "ImageryLayer",
    };
  }

  throw new Error(getUnsupportedReason(meta) || `Unsupported layer type: ${meta.type || "Unknown"}`);
}
