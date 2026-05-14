import "./style.css";

import { MapController } from "./map/mapController.js";
import { createLayerFromMetadata } from "./map/layerFactory.js";
import { hideInspector, showInspector } from "./map/inspector.js";

import Expand from "@arcgis/core/widgets/Expand";
import FeatureTable from "@arcgis/core/widgets/FeatureTable";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import Search from "@arcgis/core/widgets/Search";
import ScaleBar from "@arcgis/core/widgets/ScaleBar";
import Measurement from "@arcgis/core/widgets/Measurement";
import Compass from "@arcgis/core/widgets/Compass";
import Legend from "@arcgis/core/widgets/Legend";
import Home from "@arcgis/core/widgets/Home";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

import { SearchBar } from "./ui/SearchBar.js";
import { LayerList as CustomLayerList } from "./ui/LayerList.js";
import { createLayerCard } from "./ui/LayerCard.js";
import { escapeHtml, safeUrl } from "./utils/escapeHtml.js";

import { searchCatalog, getAllCatalog } from "./services/metadataService.js";

const map = new MapController("viewDiv");
const sidebar = document.getElementById("sidebar");
const app = document.getElementById("app");
const splashOverlay = document.getElementById("splashOverlay");
if (splashOverlay) {
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
let activeLayers = [];
let activeTables = [];
let searchQuery = "";
let sortBy = "default";
let activeTab = "catalog";
let filterType = "";
let filterCategory = "";
let filterSource = "";
let filterTag = "";
const catalogTableChoices = new Map();
let tableState = {
  layerMeta: null,
  layer: null,
  visible: false,
  mode: "normal",
  loaded: false,
  columns: [],
  rows: [],
};

function getUniqueItems(field, delimiter = ",") {
  return [
    ...new Set(
      catalogData.flatMap((item) => {
        const value = item[field] || "";
        return value
          .toString()
          .split(delimiter)
          .map((part) => part.trim())
          .filter(Boolean);
      }),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function formatCategoryLabel(category) {
  return category
    .replace(/\/Categories\//g, "")
    .replace(/\//g, " / ")
    .trim();
}

const categories = getUniqueItems("categories");
const tags = getUniqueItems("tags");
const sources = getUniqueItems("source");

const header = document.createElement("section");
header.className = "sidebar__header";
header.innerHTML = `
  <div class="sidebar__brand">
    <div class="sidebar__brand-copy">
      <div class="sidebar__brand-title">Seattle GeoData Explorer</div>
      <div class="sidebar__brand-subtitle">Discover, map, and inspect Seattle public GIS datasets from one catalog-driven workspace.</div>
    </div>
  </div>
  <div class="sidebar__toolbar">
    <button type="button" class="sidebar__toolbar-button" id="projectInfoButton" title="Project Info">ℹ</button>
    <a href="https://github.com/benjiantolin/seattle-geodata-explorer" class="sidebar__toolbar-button sidebar__toolbar-link" title="GitHub Repository" target="_blank" rel="noopener">🐙</a>    <a href="https://www.linkedin.com/in/benjaminantolin/" class="sidebar__toolbar-button sidebar__toolbar-link" title="LinkedIn" target="_blank" rel="noopener">💼</a>
    <button type="button" class="sidebar__toolbar-button" id="shareButton" title="Share">⤴</button>
  </div>
`;

const toolbarButtons = header.querySelectorAll(".sidebar__toolbar-button");
toolbarButtons[0]?.setAttribute("aria-label", "Project information");
toolbarButtons[1]?.setAttribute("aria-label", "GitHub repository");
toolbarButtons[2]?.setAttribute("aria-label", "LinkedIn profile");
toolbarButtons[3]?.setAttribute("aria-label", "Share app");
if (toolbarButtons[0]) toolbarButtons[0].textContent = "i";
if (toolbarButtons[1]) toolbarButtons[1].textContent = "GH";
if (toolbarButtons[2]) toolbarButtons[2].textContent = "in";
if (toolbarButtons[3]) toolbarButtons[3].textContent = "S";

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
typeFilterSelect.innerHTML = `
  <option value="">All types</option>
  <option value="Feature Service">Feature Service</option>
  <option value="Map Service">Map Service</option>
  <option value="Image Service">Image Service</option>
`;
typeFilterSelect.addEventListener("change", (event) => {
  filterType = event.target.value;
  renderCatalog();
});
filterRow.appendChild(typeFilterSelect);

const categoryFilterSelect = document.createElement("select");
categoryFilterSelect.className = "sidebar__filter";
categoryFilterSelect.innerHTML = [
  `
  <option value="">All categories</option>
`,
  ...categories.map(
    (category) =>
      `<option value="${category}">${formatCategoryLabel(category)}</option>`,
  ),
].join("");
categoryFilterSelect.addEventListener("change", (event) => {
  filterCategory = event.target.value;
  renderCatalog();
});
filterRow.appendChild(categoryFilterSelect);

const sourceFilterSelect = document.createElement("select");
sourceFilterSelect.className = "sidebar__filter";
sourceFilterSelect.innerHTML = [
  `
  <option value="">All sources</option>
`,
  ...sources.map((source) => `<option value="${source}">${source}</option>`),
].join("");
sourceFilterSelect.addEventListener("change", (event) => {
  filterSource = event.target.value;
  renderCatalog();
});
filterRow.appendChild(sourceFilterSelect);

const tagFilterWrapper = document.createElement("div");
tagFilterWrapper.className = "sidebar__tag-wrapper";

const tagFilterInput = document.createElement("input");
tagFilterInput.className = "sidebar__tag-search";
tagFilterInput.setAttribute("list", "tagOptions");
tagFilterInput.placeholder = "Search tags…";
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

const layerSummary = document.createElement("div");
layerSummary.className = "sidebar__summary";

const catalogHeader = document.createElement("div");
catalogHeader.className = "sidebar__section-heading";
catalogHeader.textContent = "Layer Catalog";

const activeHeader = document.createElement("div");
activeHeader.className = "sidebar__section-heading hidden active-header";
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
activeContainer.className = "sidebar__layer-list hidden";
const activeTablesContainer = document.createElement("div");
activeTablesContainer.id = "activeTablesContainer";
activeTablesContainer.className = "sidebar__layer-list hidden";


const activeTablesHeader = document.createElement("div");
activeTablesHeader.className =
  "sidebar__section-heading hidden active-tables-header";
activeTablesHeader.textContent = "Active Tables";

const tablePanel = document.createElement("div");
tablePanel.className = "sidebar__table-panel hidden";
tablePanel.innerHTML = `
  <div class="sidebar__table-header">
    <div class="sidebar__table-heading">
      <div class="sidebar__table-title">Layer Table</div>
      <div class="sidebar__table-subtitle">Browse attributes in a native ArcGIS table view.</div>
    </div>
    <div class="sidebar__table-actions">
      <button type="button" class="sidebar__table-icon-button sidebar__table-fullscreen" title="Fullscreen table" aria-label="Open fullscreen table" aria-pressed="false">
        <span class="table-icon table-icon--expand" aria-hidden="true"><span></span><span></span><span></span><span></span></span>
      </button>
      <button type="button" class="sidebar__table-icon-button sidebar__table-toggle" title="Hide table" aria-label="Hide table">
        <span class="table-icon table-icon--minimize" aria-hidden="true"></span>
      </button>
    </div>
  </div>
  <div class="sidebar__table-info">
    <div class="sidebar__table-layer">No table loaded</div>
    <div class="sidebar__table-message">Select a loaded feature layer and tap Table.</div>
  </div>
  <div class="sidebar__table-body"></div>
  <div class="sidebar__table-resize-handle" aria-hidden="true"></div>
`;

tablePanel
  .querySelector(".sidebar__table-toggle")
  .addEventListener("click", () => {
    tableState.visible = !tableState.visible;
    renderTablePanel();
  });

tablePanel
  .querySelector(".sidebar__table-fullscreen")
  .addEventListener("click", () => {
    tableState.mode =
      tableState.mode === "fullscreen" ? "normal" : "fullscreen";
    resetTablePanelPosition();
    renderTablePanel();
  });

const tableHeader = tablePanel.querySelector(".sidebar__table-header");
tableHeader.addEventListener("pointerdown", startTablePanelDrag);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && tableState.mode === "fullscreen") {
    tableState.mode = "normal";
    resetTablePanelPosition();
    renderTablePanel();
  }
});

sidebar.appendChild(header);
sidebar.appendChild(controls);
sidebar.appendChild(tabBar);
sidebar.appendChild(layerSummary);
sidebar.appendChild(catalogHeader);
sidebar.appendChild(activeHeader);
sidebar.appendChild(catalogContainer);
sidebar.appendChild(activeContainer);
sidebar.appendChild(activeTablesHeader);
sidebar.appendChild(activeTablesContainer);

const sidebarFooter = document.createElement("div");
sidebarFooter.className = "sidebar__footer";
sidebarFooter.innerHTML = `Built with <span class="footer-coffee">☕</span> by <a href="https://github.com/benjiantolin/seattle-geodata-explorer" target="_blank" rel="noreferrer">Benji</a>`;
sidebar.appendChild(sidebarFooter);

app.appendChild(tablePanel);

const tableToggleButton = document.createElement("button");
tableToggleButton.className = "table-toggle-floating hidden";
tableToggleButton.innerHTML = "📊";
tableToggleButton.title = "Open table";
tableToggleButton.addEventListener("click", () => {
  tableState.visible = true;
  renderTablePanel();
});
app.appendChild(tableToggleButton);

const basemapContainer = document.createElement("div");
basemapContainer.className = "map-tools-widget";
const measurementContainer = document.createElement("div");
measurementContainer.className = "map-tools-widget";

const searchWidget = new Search({ view: map.view });
const basemapGallery = new BasemapGallery({
  view: map.view,
  container: basemapContainer,
});
const measurement = new Measurement({
  view: map.view,
  container: measurementContainer,
});
const scaleBar = new ScaleBar({ view: map.view });

const basemapExpand = new Expand({
  view: map.view,
  content: basemapContainer,
  expanded: false,
  expandTooltip: "Basemaps",
});

const measurementExpand = new Expand({
  view: map.view,
  content: measurementContainer,
  expanded: false,
  expandTooltip: "Measurement tools",
});

const legend = new Legend({ view: map.view });
const legendExpand = new Expand({
  view: map.view,
  content: legend,
  expanded: false,
  expandTooltip: "Legend",
});

map.view.ui.add(searchWidget, "top-right");
map.view.ui.add(new Home({ view: map.view }), "top-right");
map.view.ui.add(basemapExpand, "top-right");
map.view.ui.add(measurementExpand, "top-right");
map.view.ui.add(legendExpand, "top-right");
map.view.ui.add(scaleBar, "top-right");
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
      <p class="project-notes__lede">Seattle GeoData Explorer is a prototype for modern geospatial data interaction. It explores what becomes possible when an open data catalog becomes part of the mapping experience itself.</p>
    </section>
    <section class="project-notes__section">
      <h4>Overview</h4>
      <p>The app brings civic open data discovery, dynamic layer loading, interactive mapping, and table exploration into one lightweight workspace for Seattle public GIS data.</p>
    </section>
    <section class="project-notes__section">
      <h4>Technical Approach</h4>
      <p>Built with Vite and the ArcGIS Maps SDK for JavaScript, the application uses catalog-style metadata to help users identify datasets, load layers into the map, and inspect spatial and attribute information through a focused custom interface informed by ArcGIS Web Components and Calcite-style UI patterns.</p>
    </section>
    <section class="project-notes__section">
      <h4>Inspiration</h4>
      <p>The project was shaped by modern web GIS patterns highlighted at the 2026 Esri Developer & Technology Summit, including web components, Calcite-style UI patterns, modular front-end architecture, and custom geospatial user experience design.</p>
    </section>
    <section class="project-notes__section">
      <h4>Rapid Prototyping</h4>
      <p>AI coding assistants supported the development workflow by accelerating iteration and helping test interface ideas quickly. The goal was to pair AI-assisted speed with GIS development judgment, not to replace it.</p>
    </section>
    <section class="project-notes__section">
      <h4>What You Can Explore</h4>
      <ul>
        <li>Browse Seattle public GIS datasets from a catalog-driven interface.</li>
        <li>Load selected datasets directly into an interactive web map.</li>
        <li>Inspect spatial features and attribute information through a dynamic table experience.</li>
        <li>Test a prototype for reimagining open data discovery as an interactive geospatial workspace.</li>
      </ul>
    </section>
    <section class="project-notes__section">
      <h4>Vision</h4>
      <p>At its core, Seattle GeoData Explorer asks how civic GIS data could feel more immediate, visual, and interactive.</p>
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
  if (!hit.results.length) {
    return;
  }

  const result = hit.results[0];
  const graphic = result.graphic;
  const layer = graphic?.layer;
  const attrs = graphic?.attributes || {};
  const active = activeLayers.find((entry) => entry.layer.id === layer?.id);
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

function renderUI() {
  updateSummary();
  renderCatalog();
  renderActiveLayers();
  renderActiveTables();
  renderTablePanel();
  updateTabVisibility();
}

function updateSummary() {
  layerSummary.textContent = `${currentCatalog().length} datasets · ${activeLayers.length} active`;
}

function currentCatalog() {
  let results = searchQuery ? searchCatalog(searchQuery) : catalogData;
  if (filterType) {
    results = results.filter((item) => item.type === filterType);
  }
  if (filterCategory) {
    results = results.filter((item) => {
      const categories = (item.categories || "")
        .split(",")
        .map((value) => value.trim());
      return categories.includes(filterCategory);
    });
  }
  if (filterSource) {
    results = results.filter((item) => item.source === filterSource);
  }
  if (filterTag) {
    const tagValue = filterTag.toLowerCase().trim();
    results = results.filter((item) => {
      const tags = (item.tags || "")
        .split(",")
        .map((value) => value.trim().toLowerCase());
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
    const aValue = (a[sortBy] || "").toString().toLowerCase();
    const bValue = (b[sortBy] || "").toString().toLowerCase();
    return aValue.localeCompare(bValue);
  });
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
  catalogContainer.classList.toggle("hidden", !catalogVisible);
  catalogHeader.classList.toggle("hidden", !catalogVisible);
  activeContainer.classList.toggle("hidden", catalogVisible);
  activeTablesContainer.classList.toggle("hidden", catalogVisible);
  activeHeader.classList.toggle("hidden", catalogVisible);
  activeTablesHeader.classList.toggle("hidden", catalogVisible);
}

async function handleAddLayer(meta) {
  if (isLayerActive(meta)) {
    return;
  }

  try {
    const result = await createLayerFromMetadata(meta);

    if (result.tables?.length) {
      return handleTableOnlyService(meta, result.tables);
    }

    const layer = result.layer;
    layer.id = getLayerId(meta);
    layer.visible = true;
    map.addLayer(layer);

    activeLayers.push({
      meta,
      layer,
      visible: true,
    });

    switchTab("active");
    renderUI();
    map.zoomToLayer(layer);
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

  requestAnimationFrame(() => {
    const card = document.querySelector(
      `[data-dataset-key="${CSS.escape(getDatasetKey(meta))}"]`,
    );
    const menu = card?.querySelector(".layer-card__menu");
    const toggle = card?.querySelector(".layer-card__menu-toggle");
    menu?.classList.remove("hidden");
    toggle?.setAttribute("aria-expanded", "true");
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
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
  tableState.visible = true;

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

function handleRemoveLayer(meta) {
  const key = getDatasetKey(meta);
  const index = activeLayers.findIndex(
    (item) => getDatasetKey(item.meta) === key,
  );
  if (index < 0) {
    return;
  }

  const item = activeLayers[index];
  map.removeLayer(item.layer.id);
  activeLayers.splice(index, 1);

  if (getDatasetKey(tableState.layerMeta) === key) {
    tableState = {
      layerMeta: null,
      layer: null,
      visible: false,
      mode: tableState.mode || "normal",
      loaded: false,
      columns: [],
      rows: [],
    };
  }

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
  return meta.id || meta.url || meta.title || "";
}

function isLayerActive(meta) {
  const key = getDatasetKey(meta);
  return activeLayers.some((item) => getDatasetKey(item.meta) === key);
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

function renderCatalogItem(meta) {
  const active = isLayerActive(meta);
  const datasetKey = getDatasetKey(meta);
  const tableChoices = catalogTableChoices.get(datasetKey) || [];
  return createLayerCard(
    meta,
    {
      primary: active ? handleRemoveLayer : handleAddLayer,
    },
    {
      primaryText: tableChoices.length ? "Tables" : active ? "Remove" : "Add",
      active,
      variant: "portal",
      datasetKey,
      tableChoices,
      primaryOpensMenu: tableChoices.length > 0,
      onTableOpen: openTableService,
    },
  );
}

function renderActiveItem(item) {
  const card = document.createElement("div");
  card.className = "active-layer-card";
  card.id = `active-layer-${item.layer.id}`;

  const title = escapeHtml(item.meta.title || "Untitled layer");
  const subtitle = `${item.meta.type || "Feature Service"}${item.meta.source ? ` / ${item.meta.source}` : item.meta.owner ? ` / ${item.meta.owner}` : ""}`;
  const tags = (item.meta.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const description = escapeHtml(
    item.meta.description || item.meta.snippet || "No description available.",
  );
  const opacity =
    typeof item.layer.opacity === "number" ? item.layer.opacity : 1;
  const owner = escapeHtml(item.meta.owner || item.meta.source || "Seattle GIS");
  const type = escapeHtml(item.meta.type || "Layer");

  card.innerHTML = `
    <div class="active-layer-card__header">
      <div class="active-layer-card__text">
        <div class="active-layer-card__title">${title}</div>
        <div class="active-layer-card__subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="active-layer-card__controls">
        <button type="button" class="icon-button visibility-toggle" title="${item.visible ? "Hide layer" : "Show layer"}" aria-label="${item.visible ? "Hide layer" : "Show layer"}">${item.visible ? "On" : "Off"}</button>
        <button type="button" class="icon-button menu-toggle" title="Actions" aria-label="Layer actions" aria-expanded="false">...</button>
      </div>
    </div>
    <div class="active-layer-card__menu hidden">
      <button type="button" class="inspector__button inspector__button--secondary action-button">Zoom to</button>
      <button type="button" class="inspector__button inspector__button--secondary action-button">View table</button>
      <a class="inspector__button inspector__button--secondary action-button" target="_blank" rel="noreferrer">Source</a>
      <button type="button" class="inspector__button inspector__button--secondary action-button">Remove</button>
      <div class="active-layer-card__setting">
        <label class="active-layer-card__setting-label">
          <span>Opacity</span>
          <span class="active-layer-card__setting-value">${Math.round(opacity * 100)}%</span>
        </label>
        <input type="range" min="0" max="1" step="0.05" value="${opacity}" class="active-layer-card__opacity" aria-label="Layer opacity" />
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
    map.zoomToLayer(item.layer);
  });

  tableButton.addEventListener("click", (event) => {
    event.stopPropagation();
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
        <button type="button" class="icon-button table-menu-toggle" title="Table actions" aria-label="Table actions" aria-expanded="false">...</button>
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
    tableState.visible = true;
    if (featureTable) {
      featureTable.layer = tableState.layer;
    }
    renderTablePanel();
  });

  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    activeTables = activeTables.filter((t) => t.title !== tableMeta.title);
    renderUI();
  });

  return card;
}

function prepareTable(item) {
  tableState.layerMeta = item.meta;
  tableState.layer = item.layer;
  tableState.visible = true;
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

function renderTablePanel() {
  const toggle = tablePanel.querySelector(".sidebar__table-toggle");
  const fullscreenButton = tablePanel.querySelector(
    ".sidebar__table-fullscreen",
  );
  const fullscreenIcon = fullscreenButton.querySelector(".table-icon");
  const tableInfo = tablePanel.querySelector(".sidebar__table-layer");
  const tableMessage = tablePanel.querySelector(".sidebar__table-message");

  tablePanel.classList.toggle("hidden", !tableState.visible);
  tablePanel.classList.toggle(
    "sidebar__table-panel--fullscreen",
    tableState.mode === "fullscreen",
  );
  toggle.textContent = tableState.visible ? "Hide" : "Show table";
  toggle.setAttribute(
    "aria-label",
    tableState.visible ? "Hide table" : "Show table",
  );
  fullscreenButton.setAttribute(
    "aria-pressed",
    String(tableState.mode === "fullscreen"),
  );
  fullscreenButton.setAttribute(
    "aria-label",
    tableState.mode === "fullscreen"
      ? "Exit fullscreen table"
      : "Open fullscreen table",
  );
  fullscreenButton.title =
    tableState.mode === "fullscreen" ? "Exit fullscreen" : "Fullscreen table";
  fullscreenIcon.classList.toggle(
    "table-icon--expand",
    tableState.mode !== "fullscreen",
  );
  fullscreenIcon.classList.toggle(
    "table-icon--restore",
    tableState.mode === "fullscreen",
  );

  // Show floating button if table is hidden but there are active tables
  tableToggleButton.classList.toggle(
    "hidden",
    tableState.visible || activeTables.length === 0,
  );

  if (!tableState.visible) {
    return;
  }

  if (!tableState.layerMeta) {
    tableInfo.textContent = "No table loaded";
    tableMessage.textContent = "Select a loaded feature layer and tap Table.";
    if (featureTable) {
      featureTable.layer = null;
    }
    return;
  }

  tableInfo.textContent = tableState.layerMeta.title;
  tableMessage.textContent =
    "Browsing attributes in a native ArcGIS FeatureTable.";
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
