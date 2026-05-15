const CITY_PREFIX = /^City of Seattle,\s*/i;

export function splitCatalogList(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((part) => splitCatalogList(part))
      .filter(Boolean);
  }

  return (value || "")
    .toString()
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function cleanOwnerLabel(value) {
  return (value || "")
    .toString()
    .replace(CITY_PREFIX, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getDisplayOwner(meta = {}) {
  return cleanOwnerLabel(meta.accessInformation) || cleanOwnerLabel(meta.owner) || "";
}

export function getOwnerFilterValue(meta = {}) {
  return (meta.accessInformation || meta.owner || "").toString().trim();
}

export function cleanCategoryLabel(category) {
  return (category || "")
    .toString()
    .replace(/\/Categories\//g, "")
    .replace(/^Categories\//i, "")
    .replace(/\//g, " / ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCategories(meta = {}) {
  return splitCatalogList(meta.categories);
}

export function getTags(meta = {}) {
  return splitCatalogList(meta.tags);
}

export function getTypeValue(meta = {}) {
  return (meta.type || "").toString().trim();
}

export function getTypeLabel(type) {
  return (type || "Dataset").toString().replace(/\s+/g, " ").trim();
}

export function formatCatalogDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function buildFilterOptions(items, getValue, getLabel = (value) => value) {
  const optionMap = new Map();

  items.forEach((item) => {
    const values = splitCatalogList(getValue(item));
    values.forEach((value) => {
      const label = (getLabel(value, item) || "").toString().trim();
      if (!value || !label) {
        return;
      }

      const key = label.toLowerCase();
      if (!optionMap.has(key)) {
        optionMap.set(key, { value, label });
      }
    });
  });

  return [...optionMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

export function isWebLoadableCatalogItem(meta = {}) {
  const type = getTypeValue(meta).toLowerCase();
  const url = (meta.url || "").toString();

  return (
    type.includes("feature") ||
    type.includes("map service") ||
    type.includes("vector tile") ||
    type.includes("image service") ||
    /\/(FeatureServer|MapServer|VectorTileServer|ImageServer)(\/\d+)?\/?$/i.test(url)
  );
}

export function getUnsupportedReason(meta = {}) {
  const type = getTypeValue(meta) || "This catalog item";

  if (isWebLoadableCatalogItem(meta)) {
    return "";
  }

  if (!meta.url) {
    return `${type} does not include a web service URL that can be added directly to the map.`;
  }

  if (/group layer/i.test(type)) {
    return "Group layers remain searchable here, but this prototype needs a concrete web service layer before it can add them to the map.";
  }

  if (/map package/i.test(type)) {
    return "Map packages are downloadable GIS resources, not directly web-loadable map layers.";
  }

  return `${type} is not directly loadable in this web map.`;
}
