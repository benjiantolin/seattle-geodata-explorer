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
  map.view.attribution.text = `${existingAttribution} | Built with ☕ by Benji`;
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

const ownerOptions = buildFilterOptions(
  catalogData,
  getOwnerFilterValue,
  (value) => getDisplayOwner({ accessInformation: value }) || getDisplayOwner({ owner: value }),
);
const categoryOptions = buildFilterOptions(
  catalogData,
  (item) => getCategories(item),
  cleanCategoryLabel,
);
const typeOptions = buildFilterOptions(
  catalogData,
  getTypeValue,
  getTypeLabel,
);
const tags = buildFilterOptions(catalogData, (item) => getTags(item)).map(
  (option) => option.label,
);

function compactFilterLabel(label, maxLength = 64) {
  const cleanLabel = (label || "").toString().replace(/\s+/g, " ").trim();
  if (cleanLabel.length <= maxLength) {
    return cleanLabel;
  }

  return `${cleanLabel.slice(0, maxLength - 3).trim()}...`;
}

const header = document.createElement("section");
header.className = "sidebar__header";
header.innerHTML = `
  <div class="sidebar__header-main">
    <div class="sidebar__brand">
      <img class="sidebar__brand-logo" src="${LOGO_URL}" alt="Seattle GeoData Explorer logo" width="36" height="36" />
      <div class="sidebar__brand-copy">
        <div class="sidebar__brand-title">Seattle GeoData Explorer</div>
      </div>
    </div>
    <div class="sidebar__toolbar" aria-label="Sidebar actions">
      <button type="button" class="sidebar__toolbar-button" id="projectInfoButton" title="About this project"></button>
      <a href="https://github.com/benjiantolin/seattle-geodata-explorer" class="sidebar__toolbar-button sidebar__toolbar-link" title="GitHub Repository" target="_blank" rel="noopener"></a>
      <a href="https://www.linkedin.com/in/benjaminantolin/" class="sidebar__toolbar-button sidebar__toolbar-link" title="LinkedIn" target="_blank" rel="noopener"></a>
      <button type="button" class="sidebar__toolbar-button" id="shareButton" title="Share"></button>
      <button type="button" class="sidebar__toolbar-button sidebar__collapse-button" id="sidebarToggleButton" title="Collapse sidebar" aria-expanded="true"></button>
    </div>
  </div>
  <div class="sidebar__brand-subtitle">Search Seattle public GIS data, load live layers, and inspect attributes from one map-first workspace.</div>
  <div class="sidebar__attribution">Built with ☕ by <a href="https://github.com/benjiantolin/seattle-geodata-explorer" target="_blank" rel="noreferrer">Benji</a></div>
`;

const toolbarButtons = header.querySelectorAll(".sidebar__toolbar-button");
toolbarButtons[0]?.setAttribute("aria-label", "About this project");
toolbarButtons[1]?.setAttribute("aria-label", "GitHub repository");
toolbarButtons[2]?.setAttribute("aria-label", "LinkedIn profile");
toolbarButtons[3]?.setAttribute("aria-label", "Share app");
toolbarButtons[4]?.setAttribute("aria-label", "Collapse sidebar");
setIcon(toolbarButtons[0], faCircleInfo);
setIcon(toolbarButtons[1], faGithub);
setIcon(toolbarButtons[2], faLinkedin);
setIcon(toolbarButtons[3], faShareFromSquare);
setIcon(toolbarButtons[4], faRightFromBracket, {
  classes: ["icon--flip-horizontal"],
});

const controls = document.createElement("div");
controls.className = "sidebar__controls";

const searchWrapper = document.createElement("div");
searchWrapper.className = "sidebar__search-wrapper";
const searchBar = new SearchBar(handleSearch);
searchBar.mount(searchWrapper);
controls.appendChild(searchWrapper);

const sortRow = document.createElement("div");
sortRow.className = "sidebar__sort-row";

const sortSelect = document.createElement("select");
sortSelect.className = "sidebar__sort";
sortSelect.innerHTML = `
  <option value="default">Sort by category + newest</option>
  <option value="title">Sort by title</option>
  <option value="owner">Sort by owner</option>
  <option value="type">Sort by type</option>
  <option value="created">Sort by created date</option>
  <option value="modified">Sort by modified date</option>
  <option value="source">Sort by source</option>
`;
sortSelect.addEventListener("change", (event) => {
  sortBy = event.target.value;
  renderCatalog();
});
sortRow.appendChild(sortSelect);
controls.appendChild(sortRow);

const filterRow = document.createElement("div");
filterRow.className = "sidebar__filters";

const typeFilterSelect = document.createElement("select");
typeFilterSelect.className = "sidebar__filter";
typeFilterSelect.setAttribute("aria-label", "Filter by data type");
typeFilterSelect.innerHTML = [
  `<option value="">All types</option>`,
  ...typeOptions.map(
    (option) =>
      `<option value="${escapeHtml(option.value)}" title="${escapeHtml(option.label)}">${escapeHtml(compactFilterLabel(option.label, 42))}</option>`,
  ),
].join("");
typeFilterSelect.addEventListener("change", (event) => {
  filterType = event.target.value;
  renderCatalog();
});

const categoryFilterSelect = document.createElement("select");
categoryFilterSelect.className = "sidebar__filter";
categoryFilterSelect.setAttribute("aria-label", "Filter by category");
categoryFilterSelect.innerHTML = [
  `<option value="">All categories</option>`,
  ...categoryOptions.map(
    (option) =>
      `<option value="${escapeHtml(option.value)}" title="${escapeHtml(option.label)}">${escapeHtml(compactFilterLabel(option.label, 54))}</option>`,
  ),
].join("");
categoryFilterSelect.addEventListener("change", (event) => {
  filterCategory = event.target.value;
  renderCatalog();
});


const ownerFilterSelect = document.createElement("select");
ownerFilterSelect.className = "sidebar__filter";
ownerFilterSelect.setAttribute("aria-label", "Filter by data owner");
ownerFilterSelect.innerHTML = [
  `<option value="">All data owners</option>`,
  ...ownerOptions.map(
    (option) =>
      `<option value="${escapeHtml(option.value)}" title="${escapeHtml(option.label)}">${escapeHtml(compactFilterLabel(option.label, 52))}</option>`,
  ),
].join("");
ownerFilterSelect.addEventListener("change", (event) => {
  filterOwner = event.target.value;
  renderCatalog();
});
filterRow.appendChild(ownerFilterSelect);
filterRow.appendChild(categoryFilterSelect);
filterRow.appendChild(typeFilterSelect);

const tagFilterWrapper = document.createElement("div");
tagFilterWrapper.className = "sidebar__tag-wrapper";

const tagFilterInput = document.createElement("input");
tagFilterInput.className = "sidebar__tag-search";
tagFilterInput.setAttribute("list", "tagOptions");
tagFilterInput.setAttribute("aria-label", "Filter by tag");
tagFilterInput.placeholder = "Search tags...";
tagFilterInput.addEventListener("input", (event) => {
  filterTag = event.target.value;
  renderCatalog();
});

const tagDatalist = document.createElement("datalist");
tagDatalist.id = "tagOptions";
tags.forEach((tag) => {
  const option = document.createElement("option");
  option.value = tag;
  tagDatalist.appendChild(option);
});

tagFilterWrapper.appendChild(tagFilterInput);
tagFilterWrapper.appendChild(tagDatalist);
filterRow.appendChild(tagFilterWrapper);

controls.appendChild(filterRow);

const filterActions = document.createElement("div");
filterActions.className = "sidebar__filter-actions";
const clearFiltersButton = document.createElement("button");
clearFiltersButton.type = "button";
clearFiltersButton.className = "sidebar__clear-filters";
clearFiltersButton.textContent = "Clear Filters";
clearFiltersButton.disabled = true;
clearFiltersButton.addEventListener("click", clearFilters);
filterActions.appendChild(clearFiltersButton);

const tabBar = document.createElement("div");
tabBar.className = "sidebar__tabs";
const catalogTab = document.createElement("button");
catalogTab.textContent = "Catalog";
catalogTab.className = "sidebar__tab sidebar__tab--active";
catalogTab.addEventListener("click", () => switchTab("catalog"));
const activeTabButton = document.createElement("button");
activeTabButton.textContent = "Active Layers";
activeTabButton.className = "sidebar__tab";
activeTabButton.addEventListener("click", () => switchTab("active"));
tabBar.appendChild(catalogTab);
tabBar.appendChild(activeTabButton);

const catalogPanel = document.createElement("section");
catalogPanel.className = "sidebar__panel sidebar__panel--catalog";
catalogPanel.id = "catalogPanel";

const activePanel = document.createElement("section");
activePanel.className = "sidebar__panel sidebar__panel--active hidden";
activePanel.id = "activePanel";

const layerSummary = document.createElement("div");
layerSummary.className = "sidebar__summary";
const layerSummaryText = document.createElement("span");
layerSummaryText.className = "sidebar__summary-text";
layerSummary.appendChild(layerSummaryText);
layerSummary.appendChild(clearFiltersButton);

const catalogHeader = document.createElement("div");
catalogHeader.className = "sidebar__section-heading";
catalogHeader.textContent = "Layer Catalog";

const activeHeader = document.createElement("div");
activeHeader.className = "sidebar__section-heading active-header";
activeHeader.innerHTML = `
  <span>Active Layers</span>
  <button type="button" class="sidebar__clear">Clear all</button>
`;
activeHeader.querySelector(".sidebar__clear").addEventListener("click", () => {
  clearAllLayers();
});

const catalogContainer = document.createElement("div");
catalogContainer.id = "catalogContainer";
catalogContainer.className = "sidebar__list";

const activeContainer = document.createElement("div");
activeContainer.id = "activeContainer";
activeContainer.className = "sidebar__layer-list";
const activeTablesContainer = document.createElement("div");
activeTablesContainer.id = "activeTablesContainer";
activeTablesContainer.className = "sidebar__layer-list";

const activeEmptyState = document.createElement("div");
activeEmptyState.className = "sidebar__empty-state";
activeEmptyState.innerHTML = `
  <strong>No active layers yet</strong>
  <span>Add a dataset from the Catalog tab to manage visibility, opacity, tables, and source links here.</span>
  <button type="button" class="sidebar__empty-action">Browse Catalog</button>
`;
activeEmptyState
  .querySelector(".sidebar__empty-action")
  .addEventListener("click", () => switchTab("catalog"));


const activeTablesHeader = document.createElement("div");
activeTablesHeader.className =
  "sidebar__section-heading active-tables-header";
activeTablesHeader.textContent = "Active Tables";

const tablePanel = document.createElement("div");
tablePanel.className = "sidebar__table-panel hidden";
tablePanel.innerHTML = `
  <div class="sidebar__table-header">
    <div class="sidebar__table-heading">
      <div class="sidebar__table-title">Layer Table</div>
      <div class="sidebar__table-subtitle">Browse attributes in a dedicated table workspace.</div>
    </div>
    <div class="sidebar__table-actions">
      <button type="button" class="sidebar__table-icon-button sidebar__table-restore" title="Maximize table" aria-label="Maximize table"></button>
      <button type="button" class="sidebar__table-icon-button sidebar__table-toggle" title="Close table" aria-label="Close table"></button>
    </div>
  </div>
  <div class="sidebar__table-info">
    <div class="sidebar__table-layer">No table loaded</div>
    <div class="sidebar__table-message">Load a layer or table, then open its attributes here.</div>
  </div>
  <div class="sidebar__table-body"></div>
  <div class="sidebar__table-resize-handle" aria-hidden="true"></div>
`;

tablePanel
  .querySelector(".sidebar__table-toggle")
  .addEventListener("click", () => {
    tableState.visible = false;
    tableState.mode = "normal";
    resetTablePanelPosition();
    renderTablePanel();
  });

tablePanel
  .querySelector(".sidebar__table-restore")
  .addEventListener("click", () => {
    if (tableState.mode === "fullscreen") {
      tableState.mode = "normal";
      resetTablePanelPosition();
    } else {
      resetTablePanelPosition();
      tableState.mode = "fullscreen";
    }
    renderTablePanel();
  });

const tableHeader = tablePanel.querySelector(".sidebar__table-header");
tableHeader.addEventListener("pointerdown", startTablePanelDrag);

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !tableState.visible) {
    return;
  }

  if (isMobileLayout()) {
    tableState.visible = false;
    tableState.mode = "normal";
    resetTablePanelPosition();
    renderTablePanel();
    return;
  }

  if (tableState.mode === "fullscreen") {
    tableState.mode = "normal";
    resetTablePanelPosition();
    renderTablePanel();
    return;
  }

  tableState.visible = false;
  tableState.mode = "normal";
  resetTablePanelPosition();
  renderTablePanel();
});

sidebar.appendChild(header);
sidebar.appendChild(tabBar);

catalogPanel.appendChild(controls);
catalogPanel.appendChild(layerSummary);
catalogPanel.appendChild(catalogHeader);
catalogPanel.appendChild(catalogContainer);

activePanel.appendChild(activeHeader);
activePanel.appendChild(activeEmptyState);
activePanel.appendChild(activeContainer);
activePanel.appendChild(activeTablesHeader);
activePanel.appendChild(activeTablesContainer);

sidebar.appendChild(catalogPanel);
sidebar.appendChild(activePanel);

const sidebarResizeHandle = document.createElement("div");
sidebarResizeHandle.className = "sidebar__resize-handle";
sidebarResizeHandle.setAttribute("role", "separator");
sidebarResizeHandle.setAttribute("aria-orientation", "vertical");
sidebarResizeHandle.setAttribute("aria-label", "Resize sidebar");
sidebar.appendChild(sidebarResizeHandle);

const sidebarReopenButton = document.createElement("button");
sidebarReopenButton.type = "button";
sidebarReopenButton.className = "sidebar-reopen-button hidden";
setIcon(sidebarReopenButton, faRightToBracket);
sidebarReopenButton.setAttribute("aria-label", "Expand sidebar");
sidebarReopenButton.title = "Expand sidebar";
sidebarReopenButton.addEventListener("click", () => setSidebarCollapsed(false));
sidebar.appendChild(sidebarReopenButton);

const sidebarRailTitle = document.createElement("div");
sidebarRailTitle.className = "sidebar__rail-title";
sidebarRailTitle.textContent = "Seattle GeoData Explorer";
sidebar.appendChild(sidebarRailTitle);

app.appendChild(tablePanel);

const basemapContainer = document.createElement("div");
basemapContainer.className = "map-tools-widget";

const searchWidget = new Search({ view: map.view });
const basemapGallery = new BasemapGallery({
  view: map.view,
  container: basemapContainer,
});

const scaleBar = new ScaleBar({ view: map.view });

const basemapExpand = new Expand({
  view: map.view,
  content: basemapContainer,
  expanded: false,
  expandTooltip: "Basemaps",
  expandIcon: "basemap",
});

const legend = new Legend({ view: map.view });
const legendExpand = new Expand({
  view: map.view,
  content: legend,
  expanded: false,
  expandTooltip: "Legend",
  expandIcon: "legend",
});

map.view.ui.add(searchWidget, "top-right");
map.view.ui.add(new Home({ view: map.view }), "top-right");
map.view.ui.add(basemapExpand, "top-right");
map.view.ui.add(legendExpand, "top-right");
map.view.ui.add(scaleBar, "bottom-right");
map.view.ui.add(new Compass({ view: map.view }), "top-right");

let featureTable = new FeatureTable({
  view: map.view,
  layer: null,
  container: tablePanel.querySelector(".sidebar__table-body"),
  visibleElements: {
    menuItems: {
      clearSelection: false,
      refreshData: true,
      toggleColumns: true,
      dataAction: false,
    },
  },
});

const catalogList = new CustomLayerList(catalogContainer, renderCatalogItem);
const activeList = new CustomLayerList(activeContainer, renderActiveItem);
const activeTablesList = new CustomLayerList(
  activeTablesContainer,
  renderActiveTableItem,
);

initializeSidebarState();
header
  .querySelector("#sidebarToggleButton")
  ?.addEventListener("click", (event) => {
    event.stopPropagation();
    setSidebarCollapsed(!isSidebarCollapsed());
  });
sidebar.addEventListener("click", (event) => {
  if (!isMobileSidebar()) {
    return;
  }

  if (
    event.target.closest("button, a, input, select, textarea, [role='button']")
  ) {
    return;
  }

  if (isSidebarCollapsed()) {
    setSidebarCollapsed(false);
    return;
  }

  if (isMobileDrawerHandleClick(event)) {
    setSidebarCollapsed(true);
  }
});
sidebarResizeHandle.addEventListener("pointerdown", startSidebarResize);
window.addEventListener("resize", () => {
  if (window.innerWidth <= 820 && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) == null) {
    setSidebarCollapsed(true, { persist: false });
  } else {
    setSidebarCollapsed(isSidebarCollapsed(), { persist: false });
  }
  renderTablePanel();
  map.resize();
});
app.addEventListener("transitionend", (event) => {
  if (event.propertyName === "grid-template-columns") {
    map.resize();
  }
});

renderUI();

const projectInfoButton = header.querySelector("#projectInfoButton");
projectInfoButton.addEventListener("click", () => {
  openProjectNotes();
});

function openProjectNotes() {
  const notes = document.createElement("div");
  notes.className = "project-notes";
  notes.innerHTML = `
    <section class="project-notes__section">
      <p class="project-notes__lede">Seattle GeoData Explorer is a map-first workspace for searching Seattle public GIS data, loading live layers, and inspecting features without leaving the map.</p>
    </section>
    <section class="project-notes__section">
      <h4>Overview</h4>
      <p>The app brings catalog discovery, dynamic layer loading, feature inspection, and table-based exploration into one lightweight workspace for Seattle public GIS data.</p>
    </section>
    <section class="project-notes__section">
      <h4>Technical Approach</h4>
      <p>Built with Vite and the ArcGIS Maps SDK for JavaScript, the application uses catalog-style metadata to help users identify datasets, load ArcGIS services into the map, and inspect spatial and attribute information through a focused custom interface.</p>
    </section>
    <section class="project-notes__section">
      <h4>Inspiration</h4>
      <p>The project was shaped by ideas from the 2026 Esri Developer & Technology Summit, modern web GIS patterns, compact dashboard interfaces, mobile-friendly catalog workflows, and custom geospatial user experience design.</p>
    </section>
    <section class="project-notes__section">
      <h4>Rapid Prototyping</h4>
      <p>GitHub Copilot, ChatGPT, and Codex supported the development workflow by accelerating iteration, helping test interface ideas quickly, and making rapid prototyping more fluid. The goal was to pair AI-assisted speed with GIS development judgment and human review.</p>
    </section>
    <section class="project-notes__section">
      <h4>What You Can Explore</h4>
      <ul>
        <li>Browse Seattle public GIS datasets from a catalog-driven interface.</li>
        <li>Load selected datasets directly into an interactive web map.</li>
        <li>Inspect spatial features and attributes through the feature inspector.</li>
        <li>Explore layer and table attributes in a resizable desktop table panel or fullscreen table workspace.</li>
        <li>Use the mobile catalog drawer and fullscreen table sheet on smaller screens.</li>
      </ul>
    </section>
    <section class="project-notes__section">
      <h4>Vision</h4>
      <p>At its core, Seattle GeoData Explorer asks how civic GIS data could feel more immediate, visual, and useful during real exploration.</p>
    </section>
  `;

  showInspector({}, "Project Notes", notes);
}

document.addEventListener("click", (event) => {
  const inspector = document.getElementById("inspector");
  if (
    inspector?.style.display === "block" &&
    !event.target.closest("#inspector") &&
    !event.target.closest("#projectInfoButton")
  ) {
    hideInspector();
  }
});

const shareButton = header.querySelector("#shareButton");
shareButton.addEventListener("click", async () => {
  const url = window.location.href;
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    alert("Link copied to clipboard.");
  } else {
    prompt("Copy this app URL:", url);
  }
});

map.view.on("click", async (event) => {
  const hit = await map.view.hitTest(event);
  const result = hit.results.find((candidate) =>
    getActiveHitGraphic(candidate?.graphic),
  );
  const graphic = getActiveHitGraphic(result?.graphic);
  if (!graphic) {
    return;
  }

  const attrs = graphic.attributes || {};
  const active = findActiveLayerForGraphic(graphic);
  const actions = [];

  if (graphic?.geometry) {
    actions.push({
      label: "Zoom to feature",
      onClick: () => {
        map.view.goTo(
          { target: graphic.geometry },
          { duration: 700, easing: "ease-in-out" },
        );
      },
    });
  }

  if (active) {
    actions.push({
      label: "View in table",
      onClick: () => prepareTable(active),
    });
    actions.push({
      label: "Open layer",
      onClick: () => scrollToActiveLayer(active.layer.id),
    });
  }

  if (active?.meta.url) {
    actions.push({
      label: "Open source",
      onClick: () => {
        const url = safeUrl(active.meta.url);
        if (url) {
          window.open(url, "_blank", "noreferrer");
        }
      },
    });
  }

  showInspector(attrs, "Feature Details", null, actions);
});

function hasUsefulAttributes(graphic) {
  const attrs = graphic?.attributes;
  if (!attrs || typeof attrs !== "object") {
    return false;
  }

  return Object.values(attrs).some((value) => value != null && value !== "");
}

function findActiveLayerForGraphic(graphic) {
  const layer = graphic?.layer;
  if (!layer) {
    return null;
  }

  return (
    activeLayers.find((entry) => {
      const activeLayer = entry.layer;
      return (
        activeLayer === layer ||
        activeLayer?.id === layer.id ||
        activeLayer?.id === layer.parent?.id ||
        activeLayer?.url === layer.url ||
        activeLayer?.url === layer.parent?.url
      );
    }) || null
  );
}

function getActiveHitGraphic(graphic) {
  if (!graphic?.geometry || !hasUsefulAttributes(graphic)) {
    return null;
  }

  return findActiveLayerForGraphic(graphic) ? graphic : null;
}

function renderUI() {
  updateSummary();
  renderCatalog();
  renderActiveLayers();
  renderActiveTables();
  renderTablePanel();
  updateTabVisibility();
}

function initializeSidebarState() {
  const storedWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
  if (Number.isFinite(storedWidth)) {
    setSidebarWidth(storedWidth, { persist: false });
  }

  const storedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  const defaultCollapsed = window.innerWidth <= 820;
  setSidebarCollapsed(
    storedCollapsed == null ? defaultCollapsed : storedCollapsed === "true",
    { persist: false },
  );
}

function clampSidebarWidth(width) {
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}

function setSidebarWidth(width, { persist = true } = {}) {
  const nextWidth = clampSidebarWidth(width);
  document.documentElement.style.setProperty("--sidebar-width", `${nextWidth}px`);
  sidebar.setAttribute("aria-valuenow", String(Math.round(nextWidth)));
  if (persist) {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(nextWidth)));
  }
  map.resize();
}

function isSidebarCollapsed() {
  return sidebar.classList.contains("sidebar--collapsed");
}

function isMobileSidebar() {
  return isMobileLayout();
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function isMobileDrawerHandleClick(event) {
  const bounds = sidebar.getBoundingClientRect();
  const handleZoneHeight = 36;
  return event.clientY >= bounds.top && event.clientY <= bounds.top + handleZoneHeight;
}

function setSidebarCollapsed(collapsed, { persist = true } = {}) {
  const isMobile = isMobileSidebar();
  app.classList.toggle("sidebar-collapsed", collapsed);
  sidebar.classList.toggle("sidebar--collapsed", collapsed);
  sidebar.setAttribute("aria-hidden", "false");
  sidebarReopenButton.classList.toggle("hidden", !collapsed);
  sidebarReopenButton.setAttribute(
    "aria-label",
    isMobile ? "Open catalog drawer" : "Expand sidebar",
  );
  sidebarReopenButton.title = isMobile ? "Open catalog drawer" : "Expand sidebar";

  const toggleButton = header.querySelector("#sidebarToggleButton");
  if (toggleButton) {
    const label = isMobile
      ? collapsed
        ? "Open catalog drawer"
        : "Dock catalog drawer"
      : collapsed
        ? "Expand sidebar"
        : "Collapse sidebar";
    toggleButton.setAttribute("aria-expanded", String(!collapsed));
    toggleButton.setAttribute("aria-label", label);
    toggleButton.title = label;

    if (isMobile) {
      setIcon(toggleButton, collapsed ? faAngleUp : faWindowMinimize);
    } else {
      setIcon(toggleButton, collapsed ? faRightToBracket : faRightFromBracket, {
        classes: collapsed ? [] : ["icon--flip-horizontal"],
      });
    }
  }

  if (persist) {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }

  map.resize();
  window.setTimeout(() => map.resize(), 240);
}

function startSidebarResize(event) {
  if (event.button !== 0 || window.innerWidth <= 820 || isSidebarCollapsed()) {
    return;
  }

  event.preventDefault();
  sidebar.classList.add("sidebar--resizing");
  sidebarResizeHandle.setPointerCapture(event.pointerId);

  const handleMove = (moveEvent) => {
    setSidebarWidth(moveEvent.clientX);
  };

  const handleUp = () => {
    sidebar.classList.remove("sidebar--resizing");
    sidebarResizeHandle.releasePointerCapture(event.pointerId);
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    map.resize();
  };

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
}

function updateSummary() {
  const shown = currentCatalog().length;
  const activeFilterCount = getActiveFilterCount();
  const filterText =
    activeFilterCount === 1
      ? "1 filter"
      : activeFilterCount > 1
        ? `${activeFilterCount} filters`
        : "no filters";

  layerSummaryText.textContent = `${shown} of ${catalogData.length} datasets shown | ${activeLayers.length} active | ${filterText}`;
  clearFiltersButton.disabled = activeFilterCount === 0;
}

function currentCatalog() {
  let results = searchQuery ? searchCatalog(searchQuery) : catalogData;
  if (filterType) {
    results = results.filter((item) => getTypeValue(item) === filterType);
  }
  if (filterCategory) {
    const selectedCategoryLabel = cleanCategoryLabel(filterCategory);
    results = results.filter((item) => {
      return getCategories(item).some(
        (category) =>
          category === filterCategory ||
          cleanCategoryLabel(category) === selectedCategoryLabel,
      );
    });
  }
  if (filterOwner) {
    const selectedOwnerLabel = cleanOwnerLabel(filterOwner);
    results = results.filter(
      (item) =>
        getOwnerFilterValue(item) === filterOwner ||
        getDisplayOwner(item) === selectedOwnerLabel,
    );
  }
  if (filterTag) {
    const tagValue = filterTag.toLowerCase().trim();
    results = results.filter((item) => {
      const tags = getTags(item).map((value) => value.toLowerCase());
      return tags.some((tag) => tag.includes(tagValue));
    });
  }
  return [...results].sort((a, b) => {
    if (sortBy === "default") {
      const aCategory = (a.categories || "").toLowerCase();
      const bCategory = (b.categories || "").toLowerCase();
      if (aCategory !== bCategory) {
        return aCategory.localeCompare(bCategory);
      }
      const aDate = new Date(a.created || 0);
      const bDate = new Date(b.created || 0);
      return bDate - aDate;
    }

    if (sortBy === "created" || sortBy === "modified") {
      const aDate = new Date(a[sortBy] || 0);
      const bDate = new Date(b[sortBy] || 0);
      return bDate - aDate; // Newest first
    }
    const aValue = getSortValue(a, sortBy);
    const bValue = getSortValue(b, sortBy);
    return aValue.localeCompare(bValue);
  });
}

function getSortValue(item, field) {
  if (field === "owner") {
    return getDisplayOwner(item).toLowerCase();
  }
  if (field === "type") {
    return getTypeValue(item).toLowerCase();
  }
  return (item[field] || "").toString().toLowerCase();
}

function getActiveFilterCount() {
  return [searchQuery, filterType, filterCategory, filterOwner, filterTag].filter(
    (value) => value && value.toString().trim(),
  ).length;
}

function clearFilters() {
  searchQuery = "";
  filterType = "";
  filterCategory = "";
  filterOwner = "";
  filterTag = "";
  typeFilterSelect.value = "";
  categoryFilterSelect.value = "";
  ownerFilterSelect.value = "";
  tagFilterInput.value = "";
  const searchInput = searchWrapper.querySelector(".search-bar__input");
  if (searchInput) {
    searchInput.value = "";
  }
  renderCatalog();
}

function renderCatalog() {
  const scrollTop = catalogContainer.scrollTop;
  catalogList.render(currentCatalog());
  catalogContainer.scrollTop = scrollTop;
  updateSummary();
}

function renderActiveLayers() {
  activeList.render(activeLayers);
}

function renderActiveTables() {
  activeTablesList.render(activeTables);
}

function switchTab(tabName) {
  activeTab = tabName;
  catalogTab.classList.toggle("sidebar__tab--active", tabName === "catalog");
  activeTabButton.classList.toggle(
    "sidebar__tab--active",
    tabName === "active",
  );
  updateTabVisibility();
}

function updateTabVisibility() {
  const catalogVisible = activeTab === "catalog";
  catalogPanel.classList.toggle("hidden", !catalogVisible);
  activePanel.classList.toggle("hidden", catalogVisible);
  activeEmptyState.classList.toggle(
    "hidden",
    activeLayers.length > 0 || activeTables.length > 0,
  );
  activeContainer.classList.toggle("hidden", activeLayers.length === 0);
  activeTablesHeader.classList.toggle("hidden", activeTables.length === 0);
  activeTablesContainer.classList.toggle("hidden", activeTables.length === 0);
}

async function handleAddLayer(meta) {
  if (isLayerActive(meta)) {
    return;
  }

  const unsupportedReason = getUnsupportedReason(meta);
  if (unsupportedReason) {
    showUnsupportedItem(meta, unsupportedReason);
    return;
  }

  try {
    const result = await createLayerFromMetadata(meta);

    if (result.layerChoices?.length) {
      if (result.tables?.length) {
        catalogTableChoices.set(getDatasetKey(meta), result.tables);
      }
      return handleLayerChoices(meta, result.layerChoices, result.message);
    }

    if (!result.layer && result.tables?.length) {
      return handleTableOnlyService(meta, result.tables);
    }

    if (result.tables?.length) {
      catalogTableChoices.set(getDatasetKey(meta), result.tables);
    }

    addResolvedLayer(meta, result.layer, result);
  } catch (error) {
    showInspector(
      {
        Layer: meta.title,
        Status: "Unable to load",
        Reason: error.message,
      },
      "Layer Load Error",
    );
  }
}

function expandCatalogCard(meta) {
  requestAnimationFrame(() => {
    const card = document.querySelector(
      `[data-dataset-key="${CSS.escape(getDatasetKey(meta))}"]`,
    );
    const menu = card?.querySelector(".layer-card__menu");
    const toggle = card?.querySelector(".layer-card__menu-toggle");
    menu?.classList.remove("hidden");
    toggle?.setAttribute("aria-expanded", "true");
    toggle?.setAttribute("aria-label", "Hide dataset details");
    if (toggle) {
      toggle.title = "Hide dataset details";
      setIcon(toggle, faAngleUp);
    }
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function handleLayerChoices(meta, layerChoices, message = "") {
  hideInspector();
  catalogLayerChoices.set(getDatasetKey(meta), layerChoices);
  renderCatalog();
  expandCatalogCard(meta);

  if (message) {
    showInspector(
      {
        Dataset: meta.title || "Untitled dataset",
        Status: "Choose a layer",
        Details: message,
      },
      "Layer Choices Available",
    );
  }
}

async function openLayerChoice(meta, layerInfo) {
  const selectedMeta = {
    ...meta,
    title: layerInfo.title || `${meta.title || "Dataset"} - ${layerInfo.name}`,
    url: layerInfo.url,
    type: layerInfo.type || meta.type,
    parentTitle: meta.title,
    parentUrl: meta.url,
    parentId: meta.id,
    layerChoiceKey: getLayerChoiceKey(meta, layerInfo),
    supportsTable: layerInfo.supportsTable,
  };

  if (isLayerActive(selectedMeta)) {
    scrollToActiveLayer(getLayerId(selectedMeta));
    return true;
  }

  try {
    const result = await createLayerFromLayerChoice(meta, layerInfo);
    addResolvedLayer(selectedMeta, result.layer, {
      ...result,
      supportsTable: layerInfo.supportsTable ?? result.supportsTable,
    });
    return true;
  } catch (error) {
    showInspector(
      {
        Layer: selectedMeta.title,
        Status: "Unable to load",
        Reason: error.message,
      },
      "Layer Load Error",
    );
    return false;
  }
}

async function loadAllLayerChoices(meta, layerChoices = []) {
  const failures = [];
  for (const layerInfo of layerChoices) {
    const loaded = await openLayerChoice(meta, layerInfo);
    if (!loaded) {
      failures.push(layerInfo.name || layerInfo.title || `Layer ${layerInfo.id}`);
    }
  }

  if (failures.length) {
    showInspector(
      {
        Dataset: meta.title || "Untitled dataset",
        Loaded: `${layerChoices.length - failures.length} of ${layerChoices.length}`,
        Failed: failures.join(", "),
      },
      "Some Layers Could Not Load",
    );
  }
}

function addResolvedLayer(meta, layer, options = {}) {
  if (!layer) {
    if (options.tables?.length) {
      return handleTableOnlyService(meta, options.tables);
    }
    throw new Error("No displayable layer was returned for this dataset.");
  }

  if (isLayerActive(meta)) {
    scrollToActiveLayer(getLayerId(meta));
    return null;
  }

  layer.id = getLayerId(meta);
  layer.visible = true;
  map.addLayer(layer);

  const activeItem = {
    meta,
    layer,
    visible: true,
    defaultScaleRange: getLayerScaleRange(layer),
    scaleRangeTouched: false,
    supportsTable:
      options.supportsTable ??
      meta.supportsTable ??
      layer.type === "feature",
  };
  activeLayers.push(activeItem);

  if (typeof layer.load === "function") {
    layer
      .load()
      .then(() => {
        const loadedScaleRange = getLayerScaleRange(layer);
        if (!sameScaleRange(activeItem.defaultScaleRange, loadedScaleRange)) {
          activeItem.defaultScaleRange = loadedScaleRange;
          if (!activeItem.scaleRangeTouched) {
            renderActiveLayers();
          }
        }
      })
      .catch(() => {
        // The map layer itself will surface load errors through the existing flow.
      });
  }

  switchTab("active");
  renderUI();
  map.zoomToMetadataOrLayer(meta, layer);

  if (options.warning) {
    showInspector(
      {
        Layer: meta.title || "Layer",
        Status: "Loaded with note",
        Note: options.warning,
      },
      "Layer Loaded",
    );
  }

  return layer;
}

function showUnsupportedItem(meta, reason = getUnsupportedReason(meta)) {
  const sourceUrl = safeUrl(meta.url);
  const actions = [];

  if (sourceUrl) {
    actions.push({
      label: "Open source",
      onClick: () => window.open(sourceUrl, "_blank", "noreferrer"),
    });
  }

  showInspector(
    {
      Dataset: meta.title || "Untitled dataset",
      Type: getTypeLabel(meta.type),
      Owner: getDisplayOwner(meta) || meta.owner || "Seattle GIS",
      Status: "Not directly loadable",
      Reason: reason,
    },
    "Dataset Details",
    null,
    actions,
  );
}

function handleTableOnlyService(meta, tables) {
  hideInspector();

  if (!tables.length) {
    window.alert("No table data is available for this service.");
    return;
  }

  if (tables.length === 1) {
    openTableService(meta, tables[0]);
    return;
  }

  catalogTableChoices.set(getDatasetKey(meta), tables);
  renderCatalog();
  expandCatalogCard(meta);
}

function openTableService(meta, tableInfo) {
  hideInspector();

  tableState.layerMeta = {
    title: `${meta.title} — ${tableInfo.name}`,
    owner: meta.owner,
    type: meta.type,
    url: tableInfo.url,
  };
  tableState.layer = new FeatureLayer({
    url: tableInfo.url,
    title: tableInfo.name,
    outFields: ["*"],
  });
  openTablePanel();

  // Add to active tables if not already
  if (!activeTables.some((t) => t.url === tableInfo.url)) {
    activeTables.push(tableState.layerMeta);
  }

  if (featureTable) {
    featureTable.layer = tableState.layer;
  }

  switchTab("active");
  renderActiveTables();
  renderTablePanel();
}

function isSameTableMeta(first = {}, second = {}) {
  if (!first || !second) {
    return false;
  }

  if (first.url && second.url && first.url === second.url) {
    return true;
  }

  return Boolean(first.title && second.title && first.title === second.title);
}

function closeTableIfActive(tableMeta = {}) {
  if (!isSameTableMeta(tableState.layerMeta, tableMeta)) {
    return;
  }

  tableState = {
    layerMeta: null,
    layer: null,
    visible: false,
    mode: "normal",
    loaded: false,
    columns: [],
    rows: [],
  };

  if (featureTable) {
    featureTable.layer = null;
  }
  resetTablePanelPosition();
  renderTablePanel();
}

function removeActiveTable(tableMeta = {}) {
  activeTables = activeTables.filter((table) => !isSameTableMeta(table, tableMeta));
  closeTableIfActive(tableMeta);
  renderUI();
}

function handleRemoveLayer(meta) {
  const layersToRemove = activeLayers.filter((item) =>
    isActiveLayerMatch(item.meta, meta),
  );
  if (!layersToRemove.length) {
    return;
  }

  layersToRemove.forEach((item) => {
    map.removeLayer(item.layer.id);
  });
  activeLayers = activeLayers.filter(
    (item) => !isActiveLayerMatch(item.meta, meta),
  );
  activeTables = activeTables.filter(
    (tableMeta) => !layersToRemove.some((item) => isSameTableMeta(tableMeta, item.meta)),
  );

  layersToRemove.forEach((item) => closeTableIfActive(item.meta));

  renderUI();
}

function clearAllLayers() {
  activeLayers.forEach((item) => {
    map.removeLayer(item.layer.id);
  });
  activeLayers = [];
  activeTables = [];
  tableState = {
    layerMeta: null,
    layer: null,
    visible: false,
    mode: "normal",
    loaded: false,
    columns: [],
    rows: [],
  };
  resetTablePanelPosition();
  renderUI();
}

function handleToggleVisibility(meta) {
  const key = getDatasetKey(meta);
  const item = activeLayers.find((item) => getDatasetKey(item.meta) === key);
  if (!item) {
    return;
  }

  item.visible = !item.visible;
  if (typeof item.layer.visible !== "undefined") {
    item.layer.visible = item.visible;
  }
  renderUI();
}

function handleSearch(query) {
  searchQuery = query;
  renderCatalog();
}

function getDatasetKey(meta = {}) {
  return meta.layerChoiceKey || meta.id || meta.url || meta.title || "";
}

function getLayerChoiceKey(meta = {}, layerInfo = {}) {
  return [
    meta.id || meta.url || meta.title || "dataset",
    layerInfo.parentUrl || meta.url || "",
    layerInfo.sublayerId ?? layerInfo.id ?? layerInfo.url ?? layerInfo.name ?? "layer",
  ].join("::");
}

function isLayerActive(meta) {
  return activeLayers.some((item) => isActiveLayerMatch(item.meta, meta));
}

function isActiveLayerMatch(activeMeta = {}, targetMeta = {}) {
  const activeKey = getDatasetKey(activeMeta);
  const targetKey = getDatasetKey(targetMeta);

  if (!activeKey || !targetKey) {
    return false;
  }

  if (activeKey === targetKey) {
    return true;
  }

  if (targetMeta.layerChoiceKey) {
    return false;
  }

  return (
    (targetMeta.url && activeMeta.parentUrl === targetMeta.url) ||
    (targetMeta.id && activeMeta.parentId === targetMeta.id) ||
    (!targetMeta.url &&
      !targetMeta.id &&
      targetMeta.title &&
      activeMeta.parentTitle === targetMeta.title)
  );
}

function getLayerId(meta) {
  const key = getDatasetKey(meta) || "untitled-layer";
  return `layer-${key.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function scrollToActiveLayer(layerId) {
  switchTab("active");
  requestAnimationFrame(() => {
    const item = document.getElementById(`active-layer-${layerId}`);
    if (item) {
      item.scrollIntoView({ behavior: "smooth", block: "center" });
      item.classList.add("active-scroll-highlight");
      setTimeout(() => item.classList.remove("active-scroll-highlight"), 1400);
    }
  });
}

function usefulScale(value) {
  const scale = Number(value);
  return Number.isFinite(scale) && scale > 0 ? scale : 0;
}

function closestScaleStopIndex(scale) {
  const useful = usefulScale(scale);
  if (!useful) {
    return -1;
  }

  let closestIndex = 0;
  let closestDistance = Infinity;
  SCALE_STOPS.forEach((stop, index) => {
    const distance = Math.abs(Math.log(stop.scale) - Math.log(useful));
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return closestIndex;
}

function scaleLabel(scale) {
  const index = closestScaleStopIndex(scale);
  return index >= 0 ? SCALE_STOPS[index]?.label || "Any" : "Any";
}

function minScalePosition(scale) {
  const index = closestScaleStopIndex(scale);
  return index >= 0 ? index + 1 : 0;
}

function maxScalePosition(scale) {
  const index = closestScaleStopIndex(scale);
  return index >= 0 ? index + 1 : SCALE_RANGE_MAX;
}

function minScaleFromPosition(position) {
  const index = Number(position) - 1;
  return index >= 0 ? SCALE_STOPS[index]?.scale || 0 : 0;
}

function maxScaleFromPosition(position) {
  const numericPosition = Number(position);
  if (numericPosition >= SCALE_RANGE_MAX) {
    return 0;
  }
  const index = numericPosition - 1;
  return index >= 0 ? SCALE_STOPS[index]?.scale || 0 : 0;
}

function scalePositionLabel(position, edge) {
  const numericPosition = Number(position);
  if (edge === "min" && numericPosition <= 0) {
    return "Any";
  }
  if (edge === "max" && numericPosition >= SCALE_RANGE_MAX) {
    return "Any";
  }
  const index = numericPosition - 1;
  return index >= 0 ? SCALE_STOPS[index]?.label || "Any" : "Any";
}

function scaleRangeSummary(minScale, maxScale) {
  const zoomedOut = usefulScale(minScale);
  const zoomedIn = usefulScale(maxScale);

  if (!zoomedOut && !zoomedIn) {
    return "All scales";
  }

  if (zoomedOut && zoomedIn) {
    return `${scaleLabel(zoomedOut)} to ${scaleLabel(zoomedIn)}`;
  }

  if (zoomedOut) {
    return `${scaleLabel(zoomedOut)} and closer`;
  }

  return `Up to ${scaleLabel(zoomedIn)}`;
}

function normalizeScaleRange(minScale, maxScale, changedSide = "") {
  let normalizedMinScale = usefulScale(minScale);
  let normalizedMaxScale = usefulScale(maxScale);

  if (
    normalizedMinScale &&
    normalizedMaxScale &&
    normalizedMaxScale >= normalizedMinScale
  ) {
    if (changedSide === "min") {
      normalizedMaxScale = 0;
    } else {
      normalizedMinScale = 0;
    }
  }

  return {
    minScale: normalizedMinScale,
    maxScale: normalizedMaxScale,
  };
}

function normalizeScalePositions(minPosition, maxPosition, changedSide = "") {
  let normalizedMinPosition = Math.max(
    0,
    Math.min(SCALE_RANGE_MAX, Number(minPosition)),
  );
  let normalizedMaxPosition = Math.max(
    0,
    Math.min(SCALE_RANGE_MAX, Number(maxPosition)),
  );

  if (normalizedMinPosition > normalizedMaxPosition) {
    if (changedSide === "min") {
      normalizedMaxPosition = normalizedMinPosition;
    } else {
      normalizedMinPosition = normalizedMaxPosition;
    }
  }

  return {
    minPosition: normalizedMinPosition,
    maxPosition: normalizedMaxPosition,
  };
}

function getLayerScaleRange(layer = {}) {
  return normalizeScaleRange(layer.minScale, layer.maxScale);
}

function sameScaleRange(first = {}, second = {}) {
  return (
    usefulScale(first.minScale) === usefulScale(second.minScale) &&
    usefulScale(first.maxScale) === usefulScale(second.maxScale)
  );
}

function renderCatalogItem(meta) {
  const active = isLayerActive(meta);
  const datasetKey = getDatasetKey(meta);
  const tableChoices = catalogTableChoices.get(datasetKey) || [];
  const layerChoices = catalogLayerChoices.get(datasetKey) || [];
  const loadable = isWebLoadableCatalogItem(meta);
  const unsupportedReason = loadable ? "" : getUnsupportedReason(meta);
  const hasChoices = tableChoices.length > 0 || layerChoices.length > 0;
  return createLayerCard(
    meta,
    {
      primary: active ? handleRemoveLayer : handleAddLayer,
    },
    {
      primaryText: layerChoices.length
        ? active
          ? "Remove"
          : "Layers"
        : tableChoices.length
          ? "Tables"
          : active
            ? "Remove"
            : loadable
              ? "Add"
              : "Details",
      active,
      variant: "portal",
      datasetKey,
      layerChoices,
      tableChoices,
      primaryOpensMenu: hasChoices && !active,
      onLayerOpen: openLayerChoice,
      onLoadAllLayers: loadAllLayerChoices,
      onTableOpen: openTableService,
      disabled: !loadable && !active,
      disabledReason: unsupportedReason,
    },
  );
}

function renderActiveItem(item) {
  const card = document.createElement("div");
  card.className = "active-layer-card";
  card.id = `active-layer-${item.layer.id}`;

  const title = escapeHtml(item.meta.title || "Untitled layer");
  const subtitle = `${getTypeLabel(item.meta.type)}${getDisplayOwner(item.meta) ? ` / ${getDisplayOwner(item.meta)}` : item.meta.source ? ` / ${item.meta.source}` : ""}`;
  const tags = getTags(item.meta);
  const description = escapeHtml(
    item.meta.description || item.meta.snippet || "No description available.",
  );
  const opacity =
    typeof item.layer.opacity === "number" ? item.layer.opacity : 1;
  const scaleRange = getLayerScaleRange(item.layer);
  const minScaleIndex = minScalePosition(scaleRange.minScale);
  const maxScaleIndex = maxScalePosition(scaleRange.maxScale);
  const owner = escapeHtml(getDisplayOwner(item.meta) || item.meta.source || "Seattle GIS");
  const type = escapeHtml(getTypeLabel(item.meta.type));
  const supportsTable = item.supportsTable !== false;

  card.innerHTML = `
    <div class="active-layer-card__header">
      <div class="active-layer-card__text">
        <div class="active-layer-card__title">${title}</div>
        <div class="active-layer-card__subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="active-layer-card__controls">
        <button type="button" class="icon-button visibility-toggle" title="${item.visible ? "Hide layer" : "Show layer"}" aria-label="${item.visible ? "Hide layer" : "Show layer"}">${renderIcon(item.visible ? faEye : faEyeSlash)}</button>
        <button type="button" class="icon-button menu-toggle" title="Actions" aria-label="Layer actions" aria-expanded="false">${renderIcon(faEllipsis)}</button>
      </div>
    </div>
    <div class="active-layer-card__menu hidden">
      <button type="button" class="inspector__button inspector__button--secondary action-button">Zoom to</button>
      <button type="button" class="inspector__button inspector__button--secondary action-button table-action" ${supportsTable ? "" : "disabled"}>${supportsTable ? "View table" : "No table"}</button>
      <a class="inspector__button inspector__button--secondary action-button" target="_blank" rel="noreferrer">Source</a>
      <button type="button" class="inspector__button inspector__button--secondary action-button">Remove</button>
      <div class="active-layer-card__setting">
        <label class="active-layer-card__setting-label">
          <span>Opacity</span>
          <span class="active-layer-card__setting-value">${Math.round(opacity * 100)}%</span>
        </label>
        <input type="range" min="0" max="1" step="0.05" value="${opacity}" class="active-layer-card__opacity" style="--opacity-fill: ${opacity * 100}%;" aria-label="Layer opacity" />
      </div>
      <div class="active-layer-card__setting active-layer-card__scale-setting">
        <div class="active-layer-card__setting-label">
          <span>Visible scale</span>
          <span class="active-layer-card__scale-summary">${escapeHtml(scaleRangeSummary(scaleRange.minScale, scaleRange.maxScale))}</span>
        </div>
        <div class="active-layer-card__scale-range" style="--scale-start: ${(minScaleIndex / SCALE_RANGE_MAX) * 100}%; --scale-end: ${(maxScaleIndex / SCALE_RANGE_MAX) * 100}%;">
          <input type="range" min="0" max="${SCALE_RANGE_MAX}" step="1" value="${minScaleIndex}" class="active-layer-card__scale active-layer-card__min-scale" aria-label="Zoomed-out visibility limit" />
          <input type="range" min="0" max="${SCALE_RANGE_MAX}" step="1" value="${maxScaleIndex}" class="active-layer-card__scale active-layer-card__max-scale" aria-label="Zoomed-in visibility limit" />
        </div>
        <div class="active-layer-card__scale-edge-labels" aria-hidden="true">
          <span>Out: <output class="active-layer-card__min-scale-output">${escapeHtml(scalePositionLabel(minScaleIndex, "min"))}</output></span>
          <span>In: <output class="active-layer-card__max-scale-output">${escapeHtml(scalePositionLabel(maxScaleIndex, "max"))}</output></span>
        </div>
        <button type="button" class="active-layer-card__scale-reset">Reset</button>
      </div>
      <div class="active-layer-card__metadata">
        <div><span>Type</span>${type}</div>
        <div><span>Owner</span>${owner}</div>
      </div>
      <div class="active-layer-card__meta-block">
        <div class="active-layer-card__menu-label">Description</div>
        <div class="active-layer-card__menu-text">${description}</div>
      </div>
      ${tags.length ? `<div class="active-layer-card__tags">${tags.map((tag) => `<span class="layer-card__tag">${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    </div>
  `;

  const visibilityButton = card.querySelector(".visibility-toggle");
  const menuButton = card.querySelector(".menu-toggle");
  const menu = card.querySelector(".active-layer-card__menu");
  const zoomButton = card.querySelectorAll(".action-button")[0];
  const tableButton = card.querySelectorAll(".action-button")[1];
  const sourceLink = card.querySelectorAll(".action-button")[2];
  const removeButton = card.querySelectorAll(".action-button")[3];
  const opacityInput = card.querySelector(".active-layer-card__opacity");
  const opacityValue = card.querySelector(".active-layer-card__setting-value");
  const minScaleInput = card.querySelector(".active-layer-card__min-scale");
  const maxScaleInput = card.querySelector(".active-layer-card__max-scale");
  const scaleRangeTrack = card.querySelector(".active-layer-card__scale-range");
  const minScaleOutput = card.querySelector(".active-layer-card__min-scale-output");
  const maxScaleOutput = card.querySelector(".active-layer-card__max-scale-output");
  const scaleSummary = card.querySelector(".active-layer-card__scale-summary");
  const scaleResetButton = card.querySelector(".active-layer-card__scale-reset");

  const updateScaleControls = (changedSide = "") => {
    const nextPositions = normalizeScalePositions(
      minScaleInput.value,
      maxScaleInput.value,
      changedSide,
    );
    const nextRange = normalizeScaleRange(
      minScaleFromPosition(nextPositions.minPosition),
      maxScaleFromPosition(nextPositions.maxPosition),
      changedSide === "min" ? "min" : "max",
    );

    item.layer.minScale = nextRange.minScale;
    item.layer.maxScale = nextRange.maxScale;
    item.scaleRangeTouched = !sameScaleRange(
      nextRange,
      item.defaultScaleRange || { minScale: 0, maxScale: 0 },
    );

    const nextMinIndex = minScalePosition(nextRange.minScale);
    const nextMaxIndex = maxScalePosition(nextRange.maxScale);
    minScaleInput.value = String(nextMinIndex);
    maxScaleInput.value = String(nextMaxIndex);
    scaleRangeTrack.style.setProperty(
      "--scale-start",
      `${(nextMinIndex / SCALE_RANGE_MAX) * 100}%`,
    );
    scaleRangeTrack.style.setProperty(
      "--scale-end",
      `${(nextMaxIndex / SCALE_RANGE_MAX) * 100}%`,
    );
    minScaleOutput.textContent = scalePositionLabel(nextMinIndex, "min");
    maxScaleOutput.textContent = scalePositionLabel(nextMaxIndex, "max");
    scaleSummary.textContent = scaleRangeSummary(
      nextRange.minScale,
      nextRange.maxScale,
    );
  };

  visibilityButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handleToggleVisibility(item.meta);
  });

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = menu.classList.toggle("hidden") === false;
    menuButton.setAttribute("aria-expanded", String(expanded));
  });

  zoomButton.addEventListener("click", (event) => {
    event.stopPropagation();
    map.zoomToMetadataOrLayer(item.meta, item.layer);
  });

  tableButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!supportsTable) {
      return;
    }
    prepareTable(item);
  });

  sourceLink.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    const url = safeUrl(item.meta.url);
    if (url) {
      window.open(url, "_blank", "noreferrer");
    }
  });
  const sourceUrl = safeUrl(item.meta.url);
  sourceLink.textContent = sourceUrl ? "Source" : "No source";
  sourceLink.href = sourceUrl || "#";
  sourceLink.classList.toggle("disabled", !sourceUrl);

  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handleRemoveLayer(item.meta);
  });

  opacityInput?.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  opacityInput?.addEventListener("input", (event) => {
    event.stopPropagation();
    const alpha = Number(event.target.value);
    item.layer.opacity = alpha;
    opacityValue.textContent = `${Math.round(alpha * 100)}%`;
    event.target.style.setProperty("--opacity-fill", `${alpha * 100}%`);
  });

  [minScaleInput, maxScaleInput, scaleResetButton].forEach((control) => {
    control?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  minScaleInput?.addEventListener("input", (event) => {
    event.stopPropagation();
    updateScaleControls("min");
  });

  maxScaleInput?.addEventListener("input", (event) => {
    event.stopPropagation();
    updateScaleControls("max");
  });

  scaleResetButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    const defaultRange = item.defaultScaleRange || { minScale: 0, maxScale: 0 };
    minScaleInput.value = String(minScalePosition(defaultRange.minScale));
    maxScaleInput.value = String(maxScalePosition(defaultRange.maxScale));
    updateScaleControls();
  });

  card.addEventListener("click", () => {
    menu.classList.add("hidden");
  });

  return card;
}

function renderActiveTableItem(tableMeta) {
  const card = document.createElement("div");
  card.className = "active-table-card";

  const title = escapeHtml(tableMeta.title || "Untitled table");
  const subtitle = `${tableMeta.type || "Table"}${tableMeta.owner ? ` / ${tableMeta.owner}` : ""}`;

  card.innerHTML = `
    <div class="active-table-card__header">
      <div class="active-table-card__text">
        <div class="active-table-card__title">${title}</div>
        <div class="active-table-card__subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="active-table-card__controls">
        <button type="button" class="icon-button table-menu-toggle" title="Table actions" aria-label="Table actions" aria-expanded="false">${renderIcon(faEllipsis)}</button>
      </div>
    </div>
    <div class="active-table-card__menu hidden">
      <button type="button" class="inspector__button inspector__button--secondary action-button table-toggle">Open table</button>
      <button type="button" class="inspector__button inspector__button--secondary action-button remove-table">Remove</button>
    </div>
  `;

  const menuButton = card.querySelector(".table-menu-toggle");
  const menu = card.querySelector(".active-table-card__menu");
  const tableButton = card.querySelector(".table-toggle");
  const removeButton = card.querySelector(".remove-table");

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = menu.classList.toggle("hidden") === false;
    menuButton.setAttribute("aria-expanded", String(expanded));
  });

  tableButton.addEventListener("click", (event) => {
    event.stopPropagation();
    // Set tableState to this table
    tableState.layerMeta = tableMeta;
    tableState.layer = new FeatureLayer({
      url: tableMeta.url,
      outFields: ["*"],
    });
    openTablePanel();
    if (featureTable) {
      featureTable.layer = tableState.layer;
    }
    renderTablePanel();
  });

  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    removeActiveTable(tableMeta);
  });

  return card;
}

function prepareTable(item) {
  tableState.layerMeta = item.meta;
  tableState.layer = item.layer;
  openTablePanel();
  if (featureTable) {
    featureTable.layer = item.layer;
  }

  // Add to active tables if not already
  if (!activeTables.some((t) => t.url === item.meta.url)) {
    activeTables.push(item.meta);
  }

  renderActiveTables();
  renderTablePanel();
  switchTab("active");
}

function openTablePanel() {
  tableState.visible = true;

  if (!isMobileLayout()) {
    if (tableState.mode === "mobile-fullscreen") {
      tableState.mode = "normal";
      resetTablePanelPosition();
    }
    return;
  }

  tableState.mode = "mobile-fullscreen";
  resetTablePanelPosition();
  setSidebarCollapsed(true, { persist: false });
}

function renderTablePanel() {
  const toggle = tablePanel.querySelector(".sidebar__table-toggle");
  const restoreButton = tablePanel.querySelector(".sidebar__table-restore");
  const tableInfo = tablePanel.querySelector(".sidebar__table-layer");
  const tableMessage = tablePanel.querySelector(".sidebar__table-message");
  const isMobile = isMobileLayout();
  const isFullscreen = tableState.mode === "fullscreen" && !isMobile;

  setIcon(toggle, faCircleXmark);
  setIcon(restoreButton, isFullscreen ? faCompress : faExpand);
  tablePanel.classList.toggle("hidden", !tableState.visible);
  tablePanel.classList.toggle("sidebar__table-panel--mobile", isMobile);
  tablePanel.classList.toggle(
    "sidebar__table-panel--fullscreen",
    isFullscreen,
  );
  toggle.setAttribute("aria-label", "Close table");
  toggle.title = "Close table";
  restoreButton.classList.toggle("hidden", isMobile);
  restoreButton.setAttribute(
    "aria-label",
    isFullscreen ? "Restore table" : "Maximize table",
  );
  restoreButton.title = isFullscreen ? "Restore table" : "Maximize table";
  restoreButton.setAttribute("aria-pressed", String(isFullscreen));

  if (!tableState.visible) {
    return;
  }

  if (!tableState.layerMeta) {
    tableInfo.textContent = "No table loaded";
    tableMessage.textContent = "Load a layer or table, then open its attributes here.";
    if (featureTable) {
      featureTable.layer = null;
    }
    return;
  }

  tableInfo.textContent = tableState.layerMeta.title;
  tableMessage.textContent = isMobile
    ? "Swipe horizontally to browse fields. Scroll vertically to browse records."
    : "Use the table workspace to browse fields, records, and selected features.";
  if (featureTable) {
    featureTable.layer = tableState.layer;
  }
}

function resetTablePanelPosition() {
  tablePanel.style.left = "";
  tablePanel.style.top = "";
  tablePanel.style.right = "";
  tablePanel.style.bottom = "";
  tablePanel.style.width = "";
  tablePanel.style.height = "";
}

function startTablePanelDrag(event) {
  if (
    isMobileLayout() ||
    tableState.mode === "fullscreen" ||
    event.button !== 0 ||
    event.target.closest("button")
  ) {
    return;
  }

  const rect = tablePanel.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  tablePanel.classList.add("sidebar__table-panel--dragging");
  tablePanel.style.left = `${rect.left}px`;
  tablePanel.style.top = `${rect.top}px`;
  tablePanel.style.right = "auto";
  tablePanel.style.bottom = "auto";
  tablePanel.style.width = `${rect.width}px`;
  tablePanel.style.height = `${rect.height}px`;
  tableHeader.setPointerCapture(event.pointerId);

  const handleMove = (moveEvent) => {
    const maxLeft = window.innerWidth - rect.width - 12;
    const maxTop = window.innerHeight - rect.height - 12;
    const nextLeft = Math.min(Math.max(12, moveEvent.clientX - offsetX), maxLeft);
    const nextTop = Math.min(Math.max(12, moveEvent.clientY - offsetY), maxTop);
    tablePanel.style.left = `${nextLeft}px`;
    tablePanel.style.top = `${nextTop}px`;
  };

  const handleUp = () => {
    tablePanel.classList.remove("sidebar__table-panel--dragging");
    tableHeader.releasePointerCapture(event.pointerId);
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
  };

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", handleUp);
}
