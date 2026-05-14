import { escapeHtml } from "../utils/escapeHtml.js";

export function createLayerCard(meta, actions = {}, options = {}) {
  const variant = options.variant || "default";
  const div = document.createElement("div");
  div.className = `layer-card layer-card--${variant}`;
  if (options.active) {
    div.classList.add("layer-card--active");
  }

  const title = escapeHtml(meta.title || "Untitled dataset");
  const subtitle = escapeHtml(meta.owner || meta.source || "Seattle GIS");
  const description = escapeHtml(
    meta.snippet || meta.description || "No summary available.",
  );
  const created = meta.created
    ? new Date(meta.created).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const categoryList = (meta.categories || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const displayCategories = escapeHtml(
    categoryList
      .slice(0, 2)
      .map((category) =>
        category.replace(/\/Categories\//g, "").replace(/\//g, " / "),
      )
      .join(" · "),
  );
  const tagList = (meta.tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);

  const badge =
    options.variant === "portal"
      ? `<span class="layer-card__badge">${escapeHtml(meta.type || "Service")}</span>`
      : "";
  const tagChips = tagList.length
    ? `<div class="layer-card__tags">${tagList.map((tag) => `<span class="layer-card__tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
  const createdLabel = created
    ? `<div class="layer-card__date">${escapeHtml(created)}</div>`
    : "";
  const categoryLine = displayCategories
    ? `<div class="layer-card__categories">${displayCategories}</div>`
    : "";

  div.innerHTML = `
    <div class="layer-card__info">
      <div class="layer-card__top-row">
        <div class="layer-card__head-group">
          <div class="layer-card__heading">
            <strong class="layer-card__title">${title}</strong>
            ${badge}
          </div>
          <div class="layer-card__meta">${subtitle}</div>
        </div>
        ${createdLabel}
      </div>
      <div class="layer-card__description">${description}</div>
      ${categoryLine}
      ${tagChips}
    </div>
    <div class="layer-card__buttons"></div>
  `;

  const buttonContainer = div.querySelector(".layer-card__buttons");

  if (options.primaryText) {
    const primary = document.createElement("button");
    primary.className = "layer-card__button layer-card__button--primary";
    primary.textContent = options.primaryText;
    primary.addEventListener("click", (event) => {
      event.stopPropagation();
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
    buttonContainer.appendChild(secondary);
  }

  if (options.tertiaryText) {
    const tertiary = document.createElement("button");
    tertiary.className = "layer-card__button layer-card__button--secondary";
    tertiary.textContent = options.tertiaryText;
    tertiary.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.tertiary?.(meta);
    });
    buttonContainer.appendChild(tertiary);
  }

  if (typeof options.onCardClick === "function") {
    div.addEventListener("click", () => options.onCardClick(meta));
  }

  return div;
}
