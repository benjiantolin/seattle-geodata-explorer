import { escapeHtml, safeUrl } from "../utils/escapeHtml.js";
import { faAngleDown, faAngleUp } from "@fortawesome/free-solid-svg-icons";
import {
  cleanCategoryLabel,
  formatCatalogDate,
  getCategories,
  getDisplayOwner,
  getTags,
  getTypeLabel,
  getUnsupportedReason,
} from "../utils/catalogMetadata.js";
import { hasUsableCatalogExtent } from "../utils/extent.js";
import { renderIcon } from "../utils/icons.js";

export function createLayerCard(meta, actions = {}, options = {}) {
  const variant = options.variant || "default";
  const div = document.createElement("div");
  div.className = `layer-card layer-card--${variant}`;
  if (options.datasetKey) {
    div.dataset.datasetKey = options.datasetKey;
  }
  if (options.active) {
    div.classList.add("layer-card--active");
  }
  if (options.disabled) {
    div.classList.add("layer-card--disabled");
  }

  const title = escapeHtml(meta.title || "Untitled dataset");
  const ownerLabel = getDisplayOwner(meta) || meta.source || "Seattle GIS";
  const subtitle = escapeHtml(ownerLabel);
  const description = escapeHtml(
    meta.snippet || meta.description || "No summary available.",
  );
  const created = formatCatalogDate(meta.created);
  const modified = formatCatalogDate(meta.modified);
  const categoryList = getCategories(meta);
  const displayCategories = categoryList.map(cleanCategoryLabel).filter(Boolean);
  const tagList = getTags(meta).slice(0, 5);
  const accessInfo = meta.access || meta.accessInformation || "";
  const licenseInfo = meta.licenseInfo || meta.license || "";
  const sourceUrl = safeUrl(meta.url);
  const extentStatus = meta.extent
    ? hasUsableCatalogExtent(meta.extent)
      ? "Usable catalog extent"
      : "Extent listed, not used for zoom"
    : "";
  const unsupportedReason = options.disabled
    ? options.disabledReason || getUnsupportedReason(meta)
    : "";

  const badge =
    options.variant === "portal"
      ? `<span class="layer-card__badge">${escapeHtml(getTypeLabel(meta.type))}</span>`
      : "";
  const tagChips = tagList.length
    ? `<div class="layer-card__tags">${tagList.map((tag) => `<span class="layer-card__tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
  const tableChoices = Array.isArray(options.tableChoices)
    ? options.tableChoices
    : [];
  const layerChoices = Array.isArray(options.layerChoices)
    ? options.layerChoices
    : [];
  const layerChooser = layerChoices.length
    ? `
      <div class="layer-card__table-picker layer-card__layer-picker" aria-label="Available layers">
        <div class="layer-card__menu-label">Available layers</div>
        ${layerChoices.length > 1
          ? `<button type="button" class="layer-card__table-option layer-card__load-all-layers">
              <span>Load all layers</span>
              <small>${layerChoices.length} available layers</small>
            </button>`
          : ""}
        ${layerChoices
          .map(
            (layer) => `
              <button type="button" class="layer-card__table-option layer-card__layer-option" data-layer-id="${escapeHtml(layer.id)}">
                <span>${escapeHtml(layer.name || layer.title || `Layer ${layer.id}`)}</span>
                <small>${escapeHtml(layer.type || layer.serviceType || `Layer ${layer.id}`)}</small>
              </button>
            `,
          )
          .join("")}
      </div>
    `
    : "";
  const tableChooser = tableChoices.length
    ? `
      <div class="layer-card__table-picker" aria-label="Available tables">
        <div class="layer-card__menu-label">Tables</div>
        ${tableChoices
          .map(
            (table) => `
              <button type="button" class="layer-card__table-option" data-table-id="${escapeHtml(table.id)}">
                <span>${escapeHtml(table.name || `Table ${table.id}`)}</span>
                <small>Table ${escapeHtml(table.id)}</small>
              </button>
            `,
          )
          .join("")}
      </div>
    `
    : "";
  const createdLabel = created
    ? `<div><span>Created</span>${escapeHtml(created)}</div>`
    : "";
  const modifiedLabel = modified
    ? `<div><span>Modified</span>${escapeHtml(modified)}</div>`
    : "";
  const categoryLine = displayCategories.length
    ? `<div class="layer-card__category-row">${escapeHtml(displayCategories.join(" / "))}</div>`
    : "";
  const licenseBlock = licenseInfo
    ? `<div class="layer-card__meta-block">
        <div class="layer-card__menu-label">Access / License</div>
        <div class="layer-card__menu-text">${escapeHtml(licenseInfo)}</div>
      </div>`
    : "";
  const accessBlock =
    accessInfo && accessInfo !== licenseInfo
      ? `<div class="layer-card__detail-grid"><div><span>Access</span>${escapeHtml(accessInfo)}</div></div>`
      : "";
  const extentBlock = extentStatus
    ? `<div><span>Extent</span>${escapeHtml(extentStatus)}</div>`
    : "";
  const sourceAction = sourceUrl
    ? `<a href="${escapeHtml(sourceUrl)}" class="layer-card__button layer-card__button--secondary" target="_blank" rel="noreferrer">Open Source</a>`
    : "";
  const unsupportedBlock = unsupportedReason
    ? `<div class="layer-card__notice">${escapeHtml(unsupportedReason)}</div>`
    : "";
  const detailGrid =
    createdLabel || modifiedLabel || accessBlock || extentBlock
      ? `<div class="layer-card__detail-grid">
          ${createdLabel}
          ${modifiedLabel}
          ${extentBlock}
        </div>
        ${accessBlock}`
      : "";

  div.innerHTML = `
    <div class="layer-card__row">
      <div class="layer-card__info">
        <div class="layer-card__heading">
          <strong class="layer-card__title">${title}</strong>
          ${badge}
        </div>
        <div class="layer-card__meta">${subtitle}</div>
      </div>
      <button type="button" class="layer-card__menu-toggle" aria-expanded="false" aria-label="Show dataset details" title="Show dataset details">${renderIcon(faAngleDown)}</button>
    </div>
    <div class="layer-card__summary">${description}</div>
    <div class="layer-card__actions">
      <div class="layer-card__buttons"></div>
    </div>
    <div class="layer-card__menu hidden">
      ${unsupportedBlock}
      ${layerChooser}
      ${tableChooser}
      ${categoryLine}
      ${detailGrid}
      ${tagChips}
      ${licenseBlock}
      <div class="layer-card__secondary-actions">${sourceAction}</div>
    </div>
  `;

  const buttonContainer = div.querySelector(".layer-card__buttons");
  const secondaryActions = div.querySelector(".layer-card__secondary-actions");
  const menu = div.querySelector(".layer-card__menu");
  const menuToggle = div.querySelector(".layer-card__menu-toggle");

  const setDetailsExpanded = (expanded) => {
    menu.classList.toggle("hidden", !expanded);
    menuToggle.setAttribute("aria-expanded", String(expanded));
    menuToggle.setAttribute(
      "aria-label",
      expanded ? "Hide dataset details" : "Show dataset details",
    );
    menuToggle.title = expanded ? "Hide dataset details" : "Show dataset details";
    menuToggle.innerHTML = renderIcon(expanded ? faAngleUp : faAngleDown);
  };

  if (options.primaryText) {
    const primary = document.createElement("button");
    primary.className = "layer-card__button layer-card__button--primary";
    primary.textContent = options.primaryText;
    if (options.disabled) {
      primary.setAttribute("aria-disabled", "true");
      primary.title = unsupportedReason || "This item is not directly loadable.";
    }
    primary.addEventListener("click", (event) => {
      event.stopPropagation();
      if (options.disabled) {
        setDetailsExpanded(menu.classList.contains("hidden"));
        return;
      }
      if (options.primaryOpensMenu) {
        setDetailsExpanded(menu.classList.contains("hidden"));
        return;
      }
      actions.primary?.(meta);
    });
    buttonContainer.appendChild(primary);
  }

  if (options.secondaryText) {
    const secondary = document.createElement("button");
    secondary.className = "layer-card__button layer-card__button--secondary";
    secondary.textContent = options.secondaryText;
    secondary.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.secondary?.(meta);
    });
    secondaryActions.appendChild(secondary);
  }

  if (options.tertiaryText) {
    const tertiary = document.createElement("button");
    tertiary.className = "layer-card__button layer-card__button--secondary";
    tertiary.textContent = options.tertiaryText;
    tertiary.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.tertiary?.(meta);
    });
    secondaryActions.appendChild(tertiary);
  }

  menuToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setDetailsExpanded(menu.classList.contains("hidden"));
  });

  div.querySelectorAll(".layer-card__table-option").forEach((button) => {
    if (button.classList.contains("layer-card__layer-option") || button.classList.contains("layer-card__load-all-layers")) {
      return;
    }
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const table = tableChoices.find(
        (choice) => String(choice.id) === button.dataset.tableId,
      );
      if (table) {
        options.onTableOpen?.(meta, table);
      }
    });
  });

  div.querySelectorAll(".layer-card__layer-option").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const layer = layerChoices.find(
        (choice) => String(choice.id) === button.dataset.layerId,
      );
      if (layer) {
        options.onLayerOpen?.(meta, layer);
      }
    });
  });

  div.querySelector(".layer-card__load-all-layers")?.addEventListener("click", (event) => {
    event.stopPropagation();
    options.onLoadAllLayers?.(meta, layerChoices);
  });

  div.querySelectorAll(".layer-card__secondary-actions a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  });

  if (typeof options.onCardClick === "function") {
    div.addEventListener("click", () => options.onCardClick(meta));
  }

  return div;
}
