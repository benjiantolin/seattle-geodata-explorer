import "./style.css";

import { MapController } from "./map/mapController.js";
import { createLayerFromMetadata } from "./map/layerFactory.js";
import { showInspector } from "./map/inspector.js";

import Expand from "@arcgis/core/widgets/Expand";
import LayerListWidget from "@arcgis/core/widgets/LayerList";
import FeatureTable from "@arcgis/core/widgets/FeatureTable";
import BasemapGallery from "@arcgis/core/widgets/BasemapGallery";
import Search from "@arcgis/core/widgets/Search";
import ScaleBar from "@arcgis/core/widgets/ScaleBar";
import Measurement from "@arcgis/core/widgets/Measurement";
import Compass from "@arcgis/core/widgets/Compass";
import Legend from "@arcgis/core/widgets/Legend";
import Home from "@arcgis/core/widgets/Home";

import { SearchBar } from "./ui/SearchBar.js";
import { LayerList as CustomLayerList } from "./ui/LayerList.js";
import { createLayerCard } from "./ui/LayerCard.js";

import { searchCatalog, getAllCatalog } from "./services/metadataService.js";

const map = new MapController("viewDiv");
const sidebar = document.getElementById("sidebar");
const app = document.getElementById("app");

const catalogData = getAllCatalog();
let activeLayers = [];
let searchQuery = "";
let sortBy = "default";
let activeTab = "catalog";
let filterType = "";
let filterCategory = "";
let filterSource = "";
let filterTag = "";
let tableState = {
  layerMeta: null,
  layer: null,
  visible: false,
  loaded: false,
  columns: [],
  rows: []
};

function getUniqueItems(field, delimiter = ",") {
  return [...new Set(catalogData.flatMap(item => {
    const value = item[field] || "";
    return value
      .toString()
      .split(delimiter)
      .map(part => part.trim())
      .filter(Boolean);
  }))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function formatCategoryLabel(category) {
  return category.replace(/\/Categories\//g, "").replace(/\//g, " / ").trim();
}

const categories = getUniqueItems("categories");
const tags = getUniqueItems("tags");
const sources = getUniqueItems("source");


const header = document.createElement("section");
header.className = "sidebar__header";
header.innerHTML = `
  <div class="sidebar__brand">
    <div class="sidebar__brand-mark">S</div>
    <div class="sidebar__brand-copy">
      <div class="sidebar__brand-title">Seattle GeoData Explorer</div>
      <div class="sidebar__brand-subtitle">Explore Seattle ArcGIS services by category, source, tag and date.</div>
    </div>
  </div>
  <div class="sidebar__toolbar">
    <button type="button" class="sidebar__toolbar-button" id="projectInfoButton" title="Project Info">ℹ</button>
    <a href="mailto:MapContest@wagisa.org" class="sidebar__toolbar-button sidebar__toolbar-link" title="Contact">✉</a>
    <button type="button" class="sidebar__toolbar-button" id="shareButton" title="Share">⤴</button>
  </div>
`;

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
categoryFilterSelect.innerHTML = [`
  <option value="">All categories</option>
`,
  ...categories.map(category => `<option value="${category}">${formatCategoryLabel(category)}</option>`)
].join("");
categoryFilterSelect.addEventListener("change", (event) => {
  filterCategory = event.target.value;
  renderCatalog();
});
filterRow.appendChild(categoryFilterSelect);

const sourceFilterSelect = document.createElement("select");
sourceFilterSelect.className = "sidebar__filter";
sourceFilterSelect.innerHTML = [`
  <option value="">All sources</option>
`,
  ...sources.map(source => `<option value="${source}">${source}</option>`)
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

const tablePanel = document.createElement("div");
tablePanel.className = "sidebar__table-panel hidden";
tablePanel.innerHTML = `
  <div class="sidebar__table-header">
    <div>
      <div class="sidebar__table-title">Layer Table</div>
      <div class="sidebar__table-subtitle">Browse attributes in a native ArcGIS table view.</div>
    </div>
    <button type="button" class="sidebar__table-toggle">Hide</button>
  </div>
  <div class="sidebar__table-info">
    <div class="sidebar__table-layer">No table loaded</div>
    <div class="sidebar__table-message">Select a loaded feature layer and tap Table.</div>
  </div>
  <div class="sidebar__table-body"></div>
`;

tablePanel.querySelector(".sidebar__table-toggle").addEventListener("click", () => {
  tableState.visible = !tableState.visible;
  renderTablePanel();
});

sidebar.appendChild(header);
sidebar.appendChild(controls);
sidebar.appendChild(tabBar);
sidebar.appendChild(layerSummary);
sidebar.appendChild(catalogHeader);
sidebar.appendChild(activeHeader);
sidebar.appendChild(catalogContainer);
sidebar.appendChild(activeContainer);

const sidebarFooter = document.createElement("div");
sidebarFooter.className = "sidebar__footer";
sidebarFooter.innerHTML = `Built with <span class="footer-coffee">☕</span> by <a href="https://github.com/benjiantolin/seattle-geodata-explorer" target="_blank" rel="noreferrer">Benji</a>`;
sidebar.appendChild(sidebarFooter);

app.appendChild(tablePanel);

const layerListWidget = new LayerListWidget({
  view: map.view,
  listItemCreatedFunction: (event) => {
    const item = event.item;
    if (!item || !item.layer) {
      return;
    }

    item.actionsSections = [[
      { title: "Zoom to", id: "zoom", className: "esri-icon-zoom-in-magnifying-glass" },
      { title: "Inspect", id: "inspect", className: "esri-icon-description" },
      { title: "Remove", id: "remove", className: "esri-icon-trash" }
    ]];
  }
});

const layerListExpand = new Expand({
  view: map.view,
  content: layerListWidget,
  expanded: true,
  expandTooltip: "Active layer manager"
});

const mapToolsContainer = document.createElement("div");
mapToolsContainer.className = "map-tools-expand-content";

const searchContainer = document.createElement("div");
searchContainer.className = "map-tools-widget";
const basemapContainer = document.createElement("div");
basemapContainer.className = "map-tools-widget";
const measurementContainer = document.createElement("div");
measurementContainer.className = "map-tools-widget";
const scaleBarContainer = document.createElement("div");
scaleBarContainer.className = "map-tools-widget";

mapToolsContainer.appendChild(searchContainer);
mapToolsContainer.appendChild(basemapContainer);
mapToolsContainer.appendChild(measurementContainer);
mapToolsContainer.appendChild(scaleBarContainer);

const searchWidget = new Search({ view: map.view, container: searchContainer });
const basemapGallery = new BasemapGallery({ view: map.view, container: basemapContainer });
const measurement = new Measurement({ view: map.view, container: measurementContainer });
const scaleBar = new ScaleBar({ view: map.view, container: scaleBarContainer });

const toolsExpand = new Expand({
  view: map.view,
  content: mapToolsContainer,
  expanded: false,
  expandTooltip: "Map tools"
});

const legend = new Legend({ view: map.view });
const legendExpand = new Expand({
  view: map.view,
  content: legend,
  expanded: false,
  expandTooltip: "Legend"
});

map.view.ui.add(new Home({ view: map.view }), "top-left");
map.view.ui.add(new Compass({ view: map.view }), "top-left");
map.view.ui.add(toolsExpand, "top-left");
map.view.ui.add(legendExpand, "top-left");
map.view.ui.add(layerListExpand, "top-right");

let featureTable = new FeatureTable({
  view: map.view,
  layer: null,
  container: tablePanel.querySelector(".sidebar__table-body"),
  visibleElements: {
    menuItems: {
      clearSelection: false,
      refreshData: true,
      toggleColumns: true,
      dataAction: false
    }
  }
});

layerListWidget.on("trigger-action", (event) => {
  const layer = event.item?.layer;
  if (!layer) {
    return;
  }

  if (event.action.id === "zoom") {
    map.zoomToLayer(layer);
  }

  if (event.action.id === "inspect") {
    const active = activeLayers.find((entry) => entry.layer.id === layer.id);
    showInspector({
      title: active?.meta.title || layer.title || layer.id,
      owner: active?.meta.owner || "",
      type: active?.meta.type || layer.type,
      url: active?.meta.url || "",
      visible: layer.visible ? "Yes" : "No"
    }, "Layer Info");
  }

  if (event.action.id === "remove") {
    map.removeLayer(layer.id);
    activeLayers = activeLayers.filter((entry) => entry.layer.id !== layer.id);
    renderUI();
  }
});

const catalogList = new CustomLayerList(catalogContainer, renderCatalogItem);
const activeList = new CustomLayerList(activeContainer, renderActiveItem);

renderUI();

const projectInfoButton = header.querySelector("#projectInfoButton");
projectInfoButton.addEventListener("click", () => {
  showInspector({
    "Project": "Seattle GeoData Explorer",
    "Purpose": "Interactive discovery of Seattle open data services.",
    "How to use": "Browse, load, manage, and inspect layers. Add a layer to the table on demand.",
    "Submit by": "May 12, 2026 noon"
  }, "Project Info");
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

const splashOverlay = document.getElementById("splashOverlay");
if (splashOverlay) {
  const closeButton = splashOverlay.querySelector(".splash-overlay__close");
  const enterButton = splashOverlay.querySelector(".splash-overlay__enter");

  closeButton?.addEventListener("click", () => {
    splashOverlay.style.display = "none";
  });
  enterButton?.addEventListener("click", () => {
    splashOverlay.style.display = "none";
  });
}

map.view.on("click", async (event) => {
  const hit = await map.view.hitTest(event);
  if (hit.results.length) {
    const attrs = hit.results[0].graphic.attributes;
    showInspector(attrs, "Feature Attributes");
  }
});

function renderUI() {
  updateSummary();
  renderCatalog();
  renderActiveLayers();
  renderTablePanel();
  updateTabVisibility();
}

function updateSummary() {
  layerSummary.textContent = `${currentCatalog().length} datasets · ${activeLayers.length} active`;
}

function currentCatalog() {
  let results = searchQuery ? searchCatalog(searchQuery) : catalogData;
  if (filterType) {
    results = results.filter(item => item.type === filterType);
  }
  if (filterCategory) {
    results = results.filter(item => {
      const categories = (item.categories || "").split(",").map((value) => value.trim());
      return categories.includes(filterCategory);
    });
  }
  if (filterSource) {
    results = results.filter(item => item.source === filterSource);
  }
  if (filterTag) {
    const tagValue = filterTag.toLowerCase().trim();
    results = results.filter(item => {
      const tags = (item.tags || "").split(",").map((value) => value.trim().toLowerCase());
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

function switchTab(tabName) {
  activeTab = tabName;
  catalogTab.classList.toggle("sidebar__tab--active", tabName === "catalog");
  activeTabButton.classList.toggle("sidebar__tab--active", tabName === "active");
  updateTabVisibility();
}

function updateTabVisibility() {
  const catalogVisible = activeTab === "catalog";
  catalogContainer.classList.toggle("hidden", !catalogVisible);
  catalogHeader.classList.toggle("hidden", !catalogVisible);
  activeContainer.classList.toggle("hidden", catalogVisible);
  activeHeader.classList.toggle("hidden", catalogVisible);
}

async function handleAddLayer(meta) {
  if (isLayerActive(meta)) {
    return;
  }

  try {
    const layer = await createLayerFromMetadata(meta);
    layer.id = getLayerId(meta);
    layer.visible = true;
    map.addLayer(layer);

    activeLayers.push({
      meta,
      layer,
      visible: true
    });

    switchTab("active");
    renderUI();
    map.zoomToLayer(layer);
  } catch (error) {
    showInspector({
      "Layer": meta.title,
      "Status": "Unable to load",
      "Reason": error.message
    }, "Layer Load Error");
  }
}

function handleRemoveLayer(meta) {
  const index = activeLayers.findIndex(item => item.meta.title === meta.title);
  if (index < 0) {
    return;
  }

  const item = activeLayers[index];
  map.removeLayer(item.layer.id);
  activeLayers.splice(index, 1);

  if (tableState.layerMeta?.title === meta.title) {
    tableState = { layerMeta: null, layer: null, visible: false, loaded: false, columns: [], rows: [] };
  }

  renderUI();
}

function clearAllLayers() {
  activeLayers.forEach(item => {
    map.removeLayer(item.layer.id);
  });
  activeLayers = [];
  tableState = { layerMeta: null, layer: null, visible: false, loaded: false, columns: [], rows: [] };
  renderUI();
}

function handleToggleVisibility(meta) {
  const item = activeLayers.find(item => item.meta.title === meta.title);
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

function isLayerActive(meta) {
  return activeLayers.some(item => item.meta.title === meta.title);
}

function getLayerId(meta) {
  return `layer-${meta.title.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

function renderCatalogItem(meta) {
  const active = isLayerActive(meta);
  return createLayerCard(meta, {
    primary: active ? handleRemoveLayer : handleAddLayer
  }, {
    primaryText: active ? "Remove" : "Add",
    active,
    variant: "portal",
    onCardClick: () => showInspector({
      title: meta.title,
      owner: meta.owner,
      type: meta.type,
      url: meta.url,
      description: meta.description
    }, "Feature Service Metadata")
  });
}

function renderActiveItem(item) {
  return createLayerCard(item.meta, {
    primary: handleRemoveLayer,
    secondary: handleToggleVisibility,
    tertiary: () => prepareTable(item)
  }, {
    primaryText: "Remove",
    secondaryText: item.visible ? "Hide" : "Show",
    tertiaryText: "Table",
    active: true,
    variant: "layerlist",
    onCardClick: () => showLayerSettings(item)
  });
}

function prepareTable(item) {
  tableState.layerMeta = item.meta;
  tableState.layer = item.layer;
  tableState.visible = true;
  if (featureTable) {
    featureTable.layer = item.layer;
  }
  renderTablePanel();
  switchTab("active");
}

function renderTablePanel() {
  const toggle = tablePanel.querySelector(".sidebar__table-toggle");
  const tableInfo = tablePanel.querySelector(".sidebar__table-layer");
  const tableMessage = tablePanel.querySelector(".sidebar__table-message");

  tablePanel.classList.toggle("hidden", !tableState.visible);
  toggle.textContent = tableState.visible ? "Hide" : "Show table";

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
  tableMessage.textContent = "Browsing attributes in a native ArcGIS FeatureTable.";
  if (featureTable) {
    featureTable.layer = tableState.layer;
  }
}

function showLayerSettings(item) {
  const layer = item.layer;
  const attributes = {
    title: item.meta.title,
    owner: item.meta.owner,
    type: item.meta.type,
    visible: item.visible ? "Yes" : "No",
    url: item.meta.url
  };

  const controls = document.createElement("div");
  controls.className = "inspector__controls";

  if (typeof layer.opacity !== "undefined") {
    const opacityRow = document.createElement("div");
    opacityRow.className = "inspector__control-row";
    opacityRow.innerHTML = `
      <label>Opacity <span class="inspector__control-value">${layer.opacity}</span></label>
      <input type="range" min="0" max="1" step="0.05" value="${layer.opacity}" class="inspector__slider" />
    `;
    const slider = opacityRow.querySelector("input");
    const valueSpan = opacityRow.querySelector(".inspector__control-value");
    slider.addEventListener("input", (event) => {
      const alpha = Number(event.target.value);
      layer.opacity = alpha;
      valueSpan.textContent = alpha.toFixed(2);
    });
    controls.appendChild(opacityRow);
  }

  if (typeof layer.popupEnabled !== "undefined") {
    const popupRow = document.createElement("div");
    popupRow.className = "inspector__control-row inspector__control-row--toggle";
    popupRow.innerHTML = `
      <label>Popups</label>
      <input type="checkbox" ${layer.popupEnabled ? "checked" : ""} />
    `;
    popupRow.querySelector("input").addEventListener("change", (event) => {
      layer.popupEnabled = event.target.checked;
    });
    controls.appendChild(popupRow);
  }

  if (typeof layer.labelsVisible !== "undefined") {
    const labelRow = document.createElement("div");
    labelRow.className = "inspector__control-row inspector__control-row--toggle";
    labelRow.innerHTML = `
      <label>Labels</label>
      <input type="checkbox" ${layer.labelsVisible ? "checked" : ""} />
    `;
    labelRow.querySelector("input").addEventListener("change", (event) => {
      layer.labelsVisible = event.target.checked;
    });
    controls.appendChild(labelRow);
  }

  showInspector(attributes, "Layer Metadata", controls);
}
