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
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";

import { SearchBar } from "./ui/SearchBar.js";
import { LayerList as CustomLayerList } from "./ui/LayerList.js";
import { createLayerCard } from "./ui/LayerCard.js";

import { searchCatalog, getAllCatalog } from "./services/metadataService.js";

const map = new MapController("viewDiv");
const sidebar = document.getElementById("sidebar");
const app = document.getElementById("app");

// Set custom attribution
map.view.when(() => {
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
let filterContentType = "";
let tableState = {
  layerMeta: null,
  layer: null,
  visible: false,
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
    <div class="sidebar__brand-mark">SG</div>
    <div class="sidebar__brand-copy">
      <div class="sidebar__brand-title">Seattle GeoData Explorer</div>
      <div class="sidebar__brand-subtitle">Explore Seattle ArcGIS services by category, source, tag and date.</div>
    </div>
  </div>
  <div class="sidebar__toolbar">
    <button type="button" class="sidebar__toolbar-button" id="projectInfoButton" title="Project Info">ℹ</button>
    <a href="https://github.com/benjiantolin/seattle-geodata-explorer" class="sidebar__toolbar-button sidebar__toolbar-link" title="GitHub Repository" target="_blank" rel="noopener">🐙</a>    <a href="https://www.linkedin.com/in/benjaminantolin/" class="sidebar__toolbar-button sidebar__toolbar-link" title="LinkedIn" target="_blank" rel="noopener">💼</a>
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

const contentTypeFilterSelect = document.createElement("select");
contentTypeFilterSelect.className = "sidebar__filter";
contentTypeFilterSelect.innerHTML = `
  <option value="">All content</option>
  <option value="layers">Map layers</option>
  <option value="tables">Tables only</option>
`;
contentTypeFilterSelect.addEventListener("change", (event) => {
  filterContentType = event.target.value;
  renderCatalog();
});
filterRow.appendChild(contentTypeFilterSelect);

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

const activeTablesHeader = document.createElement("div");
activeTablesHeader.className =
  "sidebar__section-heading hidden active-tables-header";
activeTablesHeader.textContent = "Active Tables";

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

tablePanel
  .querySelector(".sidebar__table-toggle")
  .addEventListener("click", () => {
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

const layerListWidget = new LayerListWidget({
  view: map.view,
  listItemCreatedFunction: (event) => {
    const item = event.item;
    if (!item || !item.layer) {
      return;
    }

    item.actionsSections = [
      [
        {
          title: "Zoom to",
          id: "zoom",
          className: "esri-icon-zoom-in-magnifying-glass",
        },
        { title: "Inspect", id: "inspect", className: "esri-icon-description" },
        { title: "Remove", id: "remove", className: "esri-icon-trash" },
      ],
    ];
  },
});

const layerListExpand = new Expand({
  view: map.view,
  content: layerListWidget,
  expanded: true,
  expandTooltip: "Active layer manager",
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
const basemapGallery = new BasemapGallery({
  view: map.view,
  container: basemapContainer,
});
const measurement = new Measurement({
  view: map.view,
  container: measurementContainer,
});
const scaleBar = new ScaleBar({ view: map.view, container: scaleBarContainer });

const toolsExpand = new Expand({
  view: map.view,
  content: mapToolsContainer,
  expanded: false,
  expandTooltip: "Map tools",
});

const legend = new Legend({ view: map.view });
const legendExpand = new Expand({
  view: map.view,
  content: legend,
  expanded: false,
  expandTooltip: "Legend",
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
      dataAction: false,
    },
  },
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
    showInspector(
      {
        title: active?.meta.title || layer.title || layer.id,
        owner: active?.meta.owner || "",
        type: active?.meta.type || layer.type,
        url: active?.meta.url || "",
        visible: layer.visible ? "Yes" : "No",
      },
      "Layer Info",
    );
  }

  if (event.action.id === "remove") {
    map.removeLayer(layer.id);
    activeLayers = activeLayers.filter((entry) => entry.layer.id !== layer.id);
    renderUI();
  }
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
  showInspector(
    {
      Project: "Seattle GeoData Explorer",
      Purpose:
        "Interactive discovery of Seattle open data services. Built for WAGISA Map Contest.",
      Inspiration: "Dev Summit and Seattle Public Utilities Utiliview rebuild.",
      Tech: "Vite + ArcGIS SDK for custom web apps with reusable components.",
      "Data Source":
        "Single CSV export from data-seattlecitygis.opendata.arcgis.com",
      "Built With": "GitHub Copilot AI assistance in 3 evenings",
      "How to use":
        "Browse, load, manage, and inspect layers. Add a layer to the table on demand.",
      "Submit by": "May 12, 2026 noon",
    },
    "Project Info",
  );
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

window.addEventListener("load", () => {
  const splashOverlay = document.getElementById("splashOverlay");
  if (splashOverlay) {
    const closeButton = splashOverlay.querySelector(".splash-overlay__close");
    const enterButton = splashOverlay.querySelector(".splash-overlay__enter");

    const hideSplash = () => {
      splashOverlay.style.display = "none";
    };

    if (closeButton) {
      closeButton.addEventListener("click", hideSplash);
    }
    if (enterButton) {
      enterButton.addEventListener("click", hideSplash);
    }
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
      onClick: () => window.open(active.meta.url, "_blank"),
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
  if (filterContentType) {
    if (filterContentType === "layers") {
      results = results.filter(
        (item) =>
          item.type === "Feature Service" || item.type === "Map Service",
      );
    } else if (filterContentType === "tables") {
      results = results.filter(
        (item) =>
          item.type !== "Feature Service" && item.type !== "Map Service",
      );
    }
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
  if (!tables.length) {
    showInspector(
      {
        Layer: meta.title,
        Status: "No table data available",
      },
      "Table Service",
    );
    return;
  }

  if (tables.length === 1) {
    openTableService(meta, tables[0]);
    showInspector(
      {
        Service: meta.title,
        Table: tables[0].name,
        Status: "Only tabular data available. Table view opened.",
      },
      "Tabular Data",
    );
    return;
  }

  const selector = document.createElement("div");
  selector.className = "inspector__table-selector";

  tables.forEach((tableInfo) => {
    const row = document.createElement("div");
    row.className = "inspector__table-option";
    row.innerHTML = `
      <div class="inspector__table-info">
        <div class="inspector__table-name">${tableInfo.name}</div>
        <div class="inspector__table-id">Table ID ${tableInfo.id}</div>
      </div>
      <button class="inspector__button inspector__button--primary">Open table</button>
    `;
    row.querySelector("button").addEventListener("click", () => {
      openTableService(meta, tableInfo);
      showInspector(
        {
          Service: meta.title,
          Table: tableInfo.name,
          Status: "Table view opened for selected table.",
        },
        "Tabular Data",
      );
    });
    selector.appendChild(row);
  });

  showInspector(
    {
      Service: meta.title,
      Status: "This is a table-only FeatureServer. Choose a table to inspect.",
    },
    "Table-only Service",
    selector,
  );
}

function openTableService(meta, tableInfo) {
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
    loaded: false,
    columns: [],
    rows: [],
  };
  renderUI();
}

function handleToggleVisibility(meta) {
  const key = getDatasetKey(meta);
  const item = activeLayers.find(item => getDatasetKey(item.meta) === key);  if (!item) {
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
  return activeLayers.some(item => getDatasetKey(item.meta) === key);
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
  return createLayerCard(
    meta,
    {
      primary: active ? handleRemoveLayer : handleAddLayer,
    },
    {
      primaryText: active ? "Remove" : "Add",
      active,
      variant: "portal",
      onCardClick: () =>
        showInspector(
          {
            title: meta.title,
            owner: meta.owner,
            type: meta.type,
            url: meta.url,
            description: meta.description,
          },
          "Feature Service Metadata",
        ),
    },
  );
}

function renderActiveItem(item) {
  const card = document.createElement("div");
  card.className = "active-layer-card";
  card.id = `active-layer-${item.layer.id}`;

  const title = item.meta.title || "Untitled layer";
  const subtitle = `${item.meta.type || "Feature Service"}${item.meta.source ? ` · ${item.meta.source}` : item.meta.owner ? ` · ${item.meta.owner}` : ""}`;
  const tags = (item.meta.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const description =
    item.meta.description || item.meta.snippet || "No description available.";

  card.innerHTML = `
    <div class="active-layer-card__header">
      <div class="active-layer-card__text">
        <div class="active-layer-card__title">${title}</div>
        <div class="active-layer-card__subtitle">${subtitle}</div>
      </div>
      <div class="active-layer-card__controls">
        <button type="button" class="icon-button visibility-toggle" title="${item.visible ? "Hide layer" : "Show layer"}">${item.visible ? "👁" : "🚫"}</button>
        <button type="button" class="icon-button menu-toggle" title="Actions">⋯</button>
      </div>
    </div>
    <div class="active-layer-card__menu hidden">
      <button type="button" class="inspector__button inspector__button--secondary action-button">Zoom to</button>
      <button type="button" class="inspector__button inspector__button--secondary action-button">View table</button>
      <a class="inspector__button inspector__button--secondary action-button" target="_blank" rel="noreferrer">Source</a>
      <button type="button" class="inspector__button inspector__button--secondary action-button">Remove</button>
      <div class="active-layer-card__meta-block">
        <div class="active-layer-card__menu-label">Description</div>
        <div class="active-layer-card__menu-text">${description}</div>
      </div>
      ${tags.length ? `<div class="active-layer-card__tags">${tags.map((tag) => `<span class="layer-card__tag">${tag}</span>`).join("")}</div>` : ""}
    </div>
  `;

  const visibilityButton = card.querySelector(".visibility-toggle");
  const menuButton = card.querySelector(".menu-toggle");
  const menu = card.querySelector(".active-layer-card__menu");
  const zoomButton = card.querySelectorAll(".action-button")[0];
  const tableButton = card.querySelectorAll(".action-button")[1];
  const sourceLink = card.querySelectorAll(".action-button")[2];
  const removeButton = card.querySelectorAll(".action-button")[3];

  visibilityButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handleToggleVisibility(item.meta);
  });

  menuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    menu.classList.toggle("hidden");
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
    const url = item.meta.url || "#";
    if (url !== "#") {
      window.open(url, "_blank");
    }
  });
  sourceLink.textContent = item.meta.url ? "Source" : "No source";
  sourceLink.href = item.meta.url || "#";
  sourceLink.classList.toggle("disabled", !item.meta.url);

  removeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handleRemoveLayer(item.meta);
  });

  card.addEventListener("click", () => {
    menu.classList.add("hidden");
  });

  return card;
}

function renderActiveTableItem(tableMeta) {
  const card = document.createElement("div");
  card.className = "active-table-card";

  const title = tableMeta.title || "Untitled table";
  const subtitle = `${tableMeta.type || "Table"}${tableMeta.owner ? ` · ${tableMeta.owner}` : ""}`;

  card.innerHTML = `
    <div class="active-table-card__header">
      <div class="active-table-card__text">
        <div class="active-table-card__title">${title}</div>
        <div class="active-table-card__subtitle">${subtitle}</div>
      </div>
      <div class="active-table-card__controls">
        <button type="button" class="icon-button table-toggle" title="Open table">📊</button>
        <button type="button" class="icon-button remove-table" title="Remove table">✕</button>
      </div>
    </div>
  `;

  const tableButton = card.querySelector(".table-toggle");
  const removeButton = card.querySelector(".remove-table");

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

  renderTablePanel();
  switchTab("active");
}

function renderTablePanel() {
  const toggle = tablePanel.querySelector(".sidebar__table-toggle");
  const tableInfo = tablePanel.querySelector(".sidebar__table-layer");
  const tableMessage = tablePanel.querySelector(".sidebar__table-message");

  tablePanel.classList.toggle("hidden", !tableState.visible);
  toggle.textContent = tableState.visible ? "Hide" : "Show table";

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

function showLayerSettings(item) {
  const layer = item.layer;
  const attributes = {
    title: item.meta.title,
    owner: item.meta.owner,
    type: item.meta.type,
    visible: item.visible ? "Yes" : "No",
    url: item.meta.url,
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

  const activeButtonRow = document.createElement("div");
  activeButtonRow.className = "inspector__control-row";
  activeButtonRow.innerHTML = `
    <button class="inspector__button inspector__button--secondary">Show in active layers</button>
  `;
  const activeButton = activeButtonRow.querySelector("button");
  activeButton.addEventListener("click", () => {
    scrollToActiveLayer(layer.id);
  });
  controls.appendChild(activeButtonRow);

  showInspector(attributes, "Layer Metadata", controls);
}
