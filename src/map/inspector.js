import { escapeHtml, safeUrl } from "../utils/escapeHtml.js";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { renderIcon } from "../utils/icons.js";

const TITLE_FIELDS = [
  "name",
  "title",
  "label",
  "asset_name",
  "assetname",
  "asset_id",
  "assetid",
  "address",
  "site_name",
  "sitename",
  "facility_name",
  "facilityname",
  "objectid",
  "fid",
  "globalid",
];

const SUBTITLE_FIELDS = [
  "layer",
  "layer_name",
  "dataset",
  "source",
  "type",
  "category",
  "status",
  "owner",
  "agency",
  "department",
];

const KEY_DETAIL_FIELDS = [
  "address",
  "name",
  "type",
  "category",
  "status",
  "owner",
  "agency",
  "department",
  "asset_id",
  "assetid",
  "objectid",
  "fid",
  "globalid",
  "created_date",
  "creationdate",
  "created",
  "last_edited_date",
  "lastediteddate",
  "updated",
  "modified",
  "editdate",
];

const CHIP_FIELDS = ["status", "type", "category", "owner"];
const ACRONYMS = new Set([
  "id",
  "url",
  "uri",
  "gis",
  "api",
  "sql",
  "html",
  "json",
  "gps",
  "x",
  "y",
  "xy",
  "spu",
  "sdot",
  "wsdot",
]);
const LABEL_ALIASES = new Map([
  ["objectid", "Object ID"],
  ["fid", "FID"],
  ["globalid", "Global ID"],
  ["assetid", "Asset ID"],
  ["asset_id", "Asset ID"],
  ["site_nm", "Site Name"],
  ["url", "URL"],
]);

export function hideInspector() {
  const panel = document.getElementById("inspector");
  if (panel) {
    panel.style.display = "none";
  }
}

export function showInspector(
  attributes,
  heading = "Attributes",
  extraNode = null,
  actions = [],
) {
  const panel = document.getElementById("inspector");
  panel.style.display = "block";
  panel.classList.toggle("inspector--project-notes", heading === "Project Notes");
  const closeLabel =
    heading === "Feature Details" ? "Close feature details" : "Close panel";
  const entries = getRenderableEntries(attributes);
  const isFeaturePanel = heading === "Feature Details" || heading === "Attributes";
  const eyebrow = isFeaturePanel && entries.length ? "Selected feature" : "";
  const titleMatch = findPriorityEntry(entries, TITLE_FIELDS);
  const summary = isFeaturePanel && entries.length
    ? buildFeatureSummary(entries, titleMatch)
    : null;

  panel.innerHTML = `
    <div class="inspector__header">
      <div class="inspector__heading">
        ${eyebrow ? `<div class="inspector__eyebrow">${escapeHtml(eyebrow)}</div>` : ""}
        <h3>${escapeHtml(heading)}</h3>
      </div>
      <button type="button" class="inspector__close" aria-label="${closeLabel}" title="${closeLabel}">${renderIcon(faCircleXmark)}</button>
    </div>
  `;

  const closeBtn = panel.querySelector(".inspector__close");
  closeBtn.addEventListener("click", hideInspector);

  if (summary) {
    panel.appendChild(renderSummaryCard(summary));
  }

  if (actions.length) {
    const actionsBar = document.createElement("div");
    actionsBar.className = "inspector__actions";
    actions.forEach((action) => {
      const button = document.createElement("button");
      button.className = "inspector__action-button";
      button.type = "button";
      button.textContent = action.label;
      button.addEventListener("click", () => {
        action.onClick?.();
      });
      actionsBar.appendChild(button);
    });
    panel.appendChild(actionsBar);
  }

  if (extraNode) {
    panel.appendChild(extraNode);
  }

  if (!entries.length) {
    return;
  }

  if (!isFeaturePanel) {
    panel.appendChild(renderSection("Details", entries, "inspector__details"));
    return;
  }

  const usedKeys = new Set();
  if (titleMatch) {
    usedKeys.add(titleMatch.normalizedKey);
  }
  summary.chips.forEach((chip) => usedKeys.add(chip.normalizedKey));
  summary.subtitleEntries.forEach((entry) => usedKeys.add(entry.normalizedKey));

  const keyDetails = buildKeyDetails(entries, usedKeys);
  keyDetails.forEach((entry) => usedKeys.add(entry.normalizedKey));

  if (keyDetails.length) {
    panel.appendChild(renderSection("Key Details", keyDetails, "inspector__key-details"));
  }

  const remainingAttributes = entries.filter(
    (entry) => !usedKeys.has(entry.normalizedKey),
  );
  if (remainingAttributes.length) {
    panel.appendChild(
      renderSection("All Attributes", remainingAttributes, "inspector__details"),
    );
  }
}

function getRenderableEntries(attributes = {}) {
  return Object.entries(attributes)
    .filter(([, value]) => isRenderableValue(value))
    .map(([key, value], index) => ({
      key,
      label: formatFieldLabel(key),
      normalizedKey: normalizeKey(key),
      value,
      index,
    }));
}

function isRenderableValue(value) {
  return value != null && !(typeof value === "string" && value.trim() === "");
}

function buildFeatureSummary(entries, titleMatch) {
  const titleEntry = titleMatch;
  const subtitleEntries = SUBTITLE_FIELDS
    .map((field) => findPriorityEntry(entries, [field]))
    .filter(Boolean)
    .filter((entry) => entry.normalizedKey !== titleEntry?.normalizedKey)
    .filter(uniqueByNormalizedKey)
    .slice(0, 2);
  const subtitleKeys = new Set(
    subtitleEntries.map((entry) => entry.normalizedKey),
  );
  const chips = CHIP_FIELDS
    .map((field) => findPriorityEntry(entries, [field]))
    .filter(Boolean)
    .filter((entry) => entry.normalizedKey !== titleEntry?.normalizedKey)
    .filter((entry) => !subtitleKeys.has(entry.normalizedKey))
    .filter(uniqueByNormalizedKey)
    .slice(0, 4);

  return {
    title: titleEntry ? formatPlainValue(titleEntry.value, titleEntry.key) : "Selected Feature",
    subtitle: subtitleEntries.map((entry) => formatPlainValue(entry.value, entry.key)).join(" / "),
    subtitleEntries,
    chips,
  };
}

function renderSummaryCard(summary) {
  const card = document.createElement("section");
  card.className = "inspector__summary-card";

  const title = document.createElement("div");
  title.className = "inspector__summary-title";
  title.textContent = summary.title || "Selected Feature";
  card.appendChild(title);

  if (summary.subtitle) {
    const subtitle = document.createElement("div");
    subtitle.className = "inspector__summary-subtitle";
    subtitle.textContent = summary.subtitle;
    card.appendChild(subtitle);
  }

  if (summary.chips.length) {
    const chips = document.createElement("div");
    chips.className = "inspector__chips";
    summary.chips.forEach((entry) => {
      const chip = document.createElement("span");
      chip.className = "inspector__chip";
      chip.textContent = formatPlainValue(entry.value, entry.key);
      chips.appendChild(chip);
    });
    card.appendChild(chips);
  }

  return card;
}

function buildKeyDetails(entries, usedKeys) {
  const details = [];

  KEY_DETAIL_FIELDS.forEach((field) => {
    if (details.length >= 10) {
      return;
    }
    const entry = findPriorityEntry(entries, [field]);
    if (entry && !usedKeys.has(entry.normalizedKey)) {
      details.push(entry);
    }
  });

  entries.forEach((entry) => {
    if (details.length >= 6) {
      return;
    }
    if (!usedKeys.has(entry.normalizedKey) && !details.includes(entry)) {
      details.push(entry);
    }
  });

  return details;
}

function renderSection(title, entries, className) {
  const section = document.createElement("section");
  section.className = "inspector__section";

  const heading = document.createElement("div");
  heading.className = "inspector__section-heading";
  heading.textContent = title;
  section.appendChild(heading);

  const list = document.createElement("div");
  list.className = className;
  entries.forEach((entry) => {
    list.appendChild(renderDetailRow(entry));
  });
  section.appendChild(list);

  return section;
}

function renderDetailRow(entry) {
  const row = document.createElement("div");
  row.className = "inspector__detail-row";

  const keyCell = document.createElement("div");
  keyCell.className = "inspector__key";
  keyCell.textContent = entry.label;

  const valueCell = document.createElement("div");
  valueCell.className = "inspector__value";
  appendFormattedValue(valueCell, entry.value, entry.key);

  row.appendChild(keyCell);
  row.appendChild(valueCell);
  return row;
}

function appendFormattedValue(container, value, key = "") {
  const cleanUrl = getSafeUrl(value);
  if (cleanUrl) {
    const link = document.createElement("a");
    link.className = "inspector__link";
    link.href = cleanUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = cleanUrl;
    container.appendChild(link);
    return;
  }

  container.textContent = formatPlainValue(value, key);
}

function formatPlainValue(value, key = "") {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    const dateValue = getDateValue(value, key);
    if (dateValue) {
      return formatDate(dateValue);
    }
    return Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  }

  const text = String(value).trim();
  const dateValue = getDateValue(text, key);
  return dateValue ? formatDate(dateValue) : text;
}

function getDateValue(value, key = "") {
  const dateLikeKey = /date|created|modified|updated|edited|time/i.test(key);
  if (!dateLikeKey) {
    return null;
  }

  if (typeof value === "number") {
    if (value < 1000000000 || value > 4102444800000) {
      return null;
    }
    const timestamp = value < 100000000000 ? value * 1000 : value;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const cleanValue = String(value).trim();
  if (!/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(cleanValue)) {
    return null;
  }
  const date = new Date(cleanValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getSafeUrl(value) {
  if (typeof value !== "string") {
    return "";
  }
  const text = value.trim();
  if (!/^https?:\/\/[^\s<>"']+$/i.test(text)) {
    return "";
  }
  return safeUrl(text);
}

function formatFieldLabel(key = "") {
  const normalized = normalizeKey(key);
  const alias = LABEL_ALIASES.get(normalized) || LABEL_ALIASES.get(key.toLowerCase());
  if (alias) {
    return alias;
  }

  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(formatLabelWord)
    .join(" ");
}

function formatLabelWord(word) {
  const lower = word.toLowerCase();
  if (lower === "nm") {
    return "Name";
  }
  if (ACRONYMS.has(lower)) {
    return lower.toUpperCase();
  }
  return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
}

function findPriorityEntry(entries, fields) {
  const keys = fields.map(normalizeKey);
  return entries.find((entry) => keys.includes(entry.normalizedKey));
}

function normalizeKey(key = "") {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function uniqueByNormalizedKey(entry, index, list) {
  return list.findIndex((candidate) => candidate.normalizedKey === entry.normalizedKey) === index;
}
