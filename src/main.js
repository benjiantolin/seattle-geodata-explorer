import "./style.css";

import { MapController } from "./map/mapController.js";
import {
  createLayerFromLayerChoice,
  createLayerFromMetadata,
} from "./map/layerFactory.js";
import { hideInspector, showInspector } from "./map/inspector.js";

import Expand from "@arcgis/core/widgets/Expand";
import FeatureTable from "@arcgis/core/widgets/FeatureTable";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import Search from "@arcgis/core/widgets/Search";
import ScaleBar from "@arcgis/core/widgets/ScaleBar";
import Compass from "@arcgis/core/widgets/Compass";
import Legend from "@arcgis/core/widgets/Legend";
import Home from "@arcgis/core/widgets/Home";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import {
  faCircleInfo,
  faAngleUp,
  faEllipsis,
  faEye,
  faEyeSlash,
  faCompress,
  faExpand,
  faRightFromBracket,
  faRightToBracket,
  faShareFromSquare,
  faWindowMinimize,
} from "@fortawesome/free-solid-svg-icons";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { faGithub, faLinkedin } from "@fortawesome/free-brands-svg-icons";

import { SearchBar } from "./ui/SearchBar.js";
import { LayerList as CustomLayerList } from "./ui/LayerList.js";
import { createLayerCard } from "./ui/LayerCard.js";
import {
  buildFilterOptions,
  cleanOwnerLabel,
  cleanCategoryLabel,
  getCategories,
  getDisplayOwner,
  getOwnerFilterValue,
  getTags,
  getTypeLabel,
  getTypeValue,
  getUnsupportedReason,
  isWebLoadableCatalogItem,
} from "./utils/catalogMetadata.js";
import { escapeHtml, safeUrl } from "./utils/escapeHtml.js";
import { renderIcon, setIcon } from "./utils/icons.js";

import { searchCatalog, getAllCatalog } from "./services/metadataService.js";

const map = new MapController("viewDiv");
const sidebar = document.getElementById("sidebar");
const app = document.getElementById("app");
const splashOverlay = document.getElementById("splashOverlay");
const APP_BASE_URL = import.meta.env.BASE_URL || "/";
const LOGO_URL = `${APP_BASE_URL.replace(/\/?$/, "/")}assets/brand/seattle-geodata-explorer-icon-master.png`;
if (splashOverlay) {
  setIcon(splashOverlay.querySelector(".splash-overlay__close"), faCircleXmark);
  const hideSplash = () => {
    splashOverlay.classList.add("hidden");
    splashOverlay.setAttribute("aria-hidden", "true");
  };
  splashOverlay
    .querySelector(".splash-overlay__close")
    ?.addEventListener("click", hideSplash);
  splashOverlay
    .querySelector(".splash-overlay__enter")
    ?.addEventListener("click", hideSplash);
  splashOverlay
    .querySelector(".splash-overlay__learn")
    ?.addEventListener("click", (event) => {
      event.stopPropagation();
      hideSplash();
      openProjectNotes();
    });
}

// Set custom attribution
map.view.when(() => {
  if (!map.view.attribution) {
    return;
  }

  const existingAttribution = map.view.attribution.text;
  map.view.attribution.text = `${existingAttribution} | Built with \u{1F916} by Benji`;
});

const catalogData = getAllCatalog();
const SIDEBAR_WIDTH_KEY = "seattleGeoExplorer.sidebarWidth";
const SIDEBAR_COLLAPSED_KEY = "seattleGeoExplorer.sidebarCollapsed";
const SIDEBAR_MIN_WIDTH = 360;
const SIDEBAR_MAX_WIDTH = 600;
const SCALE_STOPS = [
  { label: "1:2M", scale: 2000000 },
  { label: "1:1M", scale: 1000000 },
  { label: "1:500k", scale: 500000 },
  { label: "1:250k", scale: 250000 },
  { label: "1:100k", scale: 100000 },
  { label: "1:50k", scale: 50000 },
  { label: "1:24k", scale: 24000 },
  { label: "1:10k", scale: 10000 },
  { label: "1:5k", scale: 5000 },
  { label: "1:2k", scale: 2000 },
  { label: "1:1k", scale: 1000 },
  { label: "1:500", scale: 500 },
];
const SCALE_RANGE_MAX = SCALE_STOPS.length + 1;
let currentMapScale = 0;
let currentScaleUpdateFrame = 0;
let activeLayers = [];
let activeTables = [];
let searchQuery = "";
let sortBy = "default";
let activeTab = "catalog";
let filterType = "";
let filterCategory = "";
let filterOwner = "";
let filterTag = "";
const catalogTableChoices = new Map();
const catalogLayerChoices = new Map();
let tableState = {
  layerMeta: null,
  layer: null,
  visible: false,
  mode: "normal",
  loaded: false,
  columns: [],
  rows: [],
};

// ... rest of file unchanged ...
