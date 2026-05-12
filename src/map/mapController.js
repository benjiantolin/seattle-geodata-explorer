import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";

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

  setBasemap(basemap) {
    this.map.basemap = basemap;
  }
}