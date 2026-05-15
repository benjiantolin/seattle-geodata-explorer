import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import { getDefaultSeattleView, parseCatalogExtent } from "../utils/extent.js";

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
    layer.when(() => {
      if (layer.fullExtent) {
        this.view.goTo(layer.fullExtent, {
          duration: 1000,
          easing: "ease-in-out"
        });
      }
    });
  }

  zoomToMetadataOrLayer(meta, layer) {
    const metadataExtent = parseCatalogExtent(meta?.extent);
    if (metadataExtent) {
      return this.view.goTo(metadataExtent.expand(1.08), {
        duration: 1000,
        easing: "ease-in-out"
      });
    }

    if (layer) {
      return this.zoomToLayer(layer);
    }

    return this.view.goTo(getDefaultSeattleView(), {
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
