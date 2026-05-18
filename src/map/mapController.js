import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import { getDefaultSeattleView, parseCatalogExtent } from "../utils/extent.js";

function isInterruptedNavigation(error) {
  const message = (error?.message || error?.name || "").toString().toLowerCase();
  return (
    error?.name === "AbortError" ||
    message.includes("abort") ||
    message.includes("interrupted") ||
    message.includes("cancel")
  );
}

function toArray(collection) {
  if (!collection) {
    return [];
  }
  if (Array.isArray(collection)) {
    return collection;
  }
  if (typeof collection.toArray === "function") {
    return collection.toArray();
  }
  const items = [];
  if (typeof collection.forEach === "function") {
    collection.forEach((item) => items.push(item));
  }
  return items;
}

function usefulScale(value) {
  const scale = Number(value);
  return Number.isFinite(scale) && scale > 0 ? scale : 0;
}

function ownScaleRange(layer) {
  if (!layer) {
    return null;
  }
  const minScale = usefulScale(layer.minScale);
  const maxScale = usefulScale(layer.maxScale);
  return minScale || maxScale ? { minScale, maxScale } : null;
}

function combineScaleRanges(ranges) {
  const usefulRanges = ranges.filter(Boolean);
  if (!usefulRanges.length) {
    return null;
  }

  const minScales = usefulRanges
    .map((range) => range.minScale)
    .filter((scale) => scale > 0);
  const maxScales = usefulRanges
    .map((range) => range.maxScale)
    .filter((scale) => scale > 0);

  const minScale = minScales.length ? Math.min(...minScales) : 0;
  const maxScale = maxScales.length ? Math.max(...maxScales) : 0;

  if (minScale && maxScale && maxScale >= minScale) {
    return usefulRanges[0];
  }

  return { minScale, maxScale };
}

function childScaleRanges(layer) {
  const children = [
    ...toArray(layer?.layers),
    ...toArray(layer?.allLayers),
    ...toArray(layer?.sublayers),
  ];
  const uniqueChildren = [...new Set(children)].filter(
    (child) => child && child.visible !== false,
  );
  return uniqueChildren.map((child) => getLayerScaleRange(child)).filter(Boolean);
}

function getLayerScaleRange(layer) {
  return combineScaleRanges([ownScaleRange(layer), ...childScaleRanges(layer)]);
}

function adjustedScale(currentScale, range) {
  if (!range || !Number.isFinite(currentScale) || currentScale <= 0) {
    return null;
  }

  let targetScale = currentScale;

  if (range.minScale > 0 && targetScale > range.minScale) {
    targetScale = range.minScale * 0.9;
  }

  if (range.maxScale > 0 && targetScale < range.maxScale) {
    targetScale = range.maxScale * 1.1;
  }

  return Math.abs(targetScale - currentScale) > 1 ? targetScale : null;
}

export class MapController {
  constructor(containerId) {
    this.map = new Map({ basemap: "dark-gray-vector" });

    this.view = new MapView({
      container: containerId,
      map: this.map,
      center: [-122.335, 47.61],
      zoom: 12
    });
  }

  addLayer(layer) {
    this.map.add(layer);
    return layer;
  }

  removeLayer(layerId) {
    const layer = this.map.findLayerById(layerId);
    if (layer) {
      this.map.remove(layer);
    }
  }

  zoomToLayer(layer) {
    return this.zoomToMetadataOrLayer(null, layer);
  }

  async safeGoTo(target, options = {}) {
    try {
      await this.view.goTo(target, options);
      return true;
    } catch (error) {
      if (!isInterruptedNavigation(error)) {
        console.warn("Map navigation could not complete.", error);
      }
      return false;
    }
  }

  async adjustScaleForLayer(layer) {
    if (!layer) {
      return false;
    }

    try {
      await layer.when?.();
    } catch {
      return false;
    }

    const targetScale = adjustedScale(this.view.scale, getLayerScaleRange(layer));
    if (!targetScale) {
      return false;
    }

    return this.safeGoTo(
      {
        center: this.view.center,
        scale: targetScale
      },
      {
        duration: 450,
        easing: "ease-in-out"
      }
    );
  }

  async zoomToMetadataOrLayer(meta, layer) {
    const metadataExtent = parseCatalogExtent(meta?.extent);
    if (metadataExtent) {
      const completed = await this.safeGoTo(metadataExtent.expand(1.08), {
        duration: 1000,
        easing: "ease-in-out"
      });
      return completed ? this.adjustScaleForLayer(layer) : false;
    }

    if (layer) {
      try {
        await layer.when?.();
      } catch {
        return this.safeGoTo(getDefaultSeattleView(), {
          duration: 1000,
          easing: "ease-in-out"
        });
      }

      const completed = layer.fullExtent
        ? await this.safeGoTo(layer.fullExtent, {
            duration: 1000,
            easing: "ease-in-out"
          })
        : await this.safeGoTo(getDefaultSeattleView(), {
            duration: 1000,
            easing: "ease-in-out"
          });

      return completed ? this.adjustScaleForLayer(layer) : false;
    }

    return this.safeGoTo(getDefaultSeattleView(), {
      duration: 1000,
      easing: "ease-in-out"
    });
  }

  resize() {
    requestAnimationFrame(() => {
      if (typeof this.view.resize === "function") {
        this.view.resize();
      }
    });
  }

  setBasemap(basemap) {
    this.map.basemap = basemap;
  }
}
