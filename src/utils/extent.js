import Extent from "@arcgis/core/geometry/Extent";

const DEFAULT_SEATTLE_VIEW = {
  center: [-122.335, 47.61],
  zoom: 12,
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeExtentParts(parts) {
  if (!Array.isArray(parts) || parts.length < 4) {
    return null;
  }

  const [xmin, ymin, xmax, ymax] = parts.map(toNumber);
  if ([xmin, ymin, xmax, ymax].some((value) => value == null)) {
    return null;
  }

  return { xmin, ymin, xmax, ymax };
}

function extractExtentObject(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (Array.isArray(value)) {
    if (value.length === 2 && Array.isArray(value[0]) && Array.isArray(value[1])) {
      return normalizeExtentParts([
        value[0][0],
        value[0][1],
        value[1][0],
        value[1][1],
      ]);
    }

    return normalizeExtentParts(value);
  }

  const candidate = normalizeExtentParts([
    value.xmin ?? value.xMin ?? value.left,
    value.ymin ?? value.yMin ?? value.bottom,
    value.xmax ?? value.xMax ?? value.right,
    value.ymax ?? value.yMax ?? value.top,
  ]);

  if (!candidate) {
    return null;
  }

  return {
    ...candidate,
    spatialReference:
      value.spatialReference ||
      value.spatial_reference ||
      value.sr ||
      null,
  };
}

function parseExtentValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return extractExtentObject(value);
  }

  const text = value.toString().trim();
  if (!text) {
    return null;
  }

  if (/^[\[{]/.test(text)) {
    try {
      return extractExtentObject(JSON.parse(text));
    } catch {
      return null;
    }
  }

  if (!/^-?\d/.test(text)) {
    return null;
  }

  return normalizeExtentParts(text.split(",").map((part) => part.trim()));
}

function isValidExtent(candidate) {
  if (!candidate) {
    return false;
  }

  const { xmin, ymin, xmax, ymax } = candidate;
  const width = xmax - xmin;
  const height = ymax - ymin;

  if (width <= 0 || height <= 0) {
    return false;
  }

  if (xmin < -180 || xmax > 180 || ymin < -90 || ymax > 90) {
    return false;
  }

  if (width > 5 || height > 5) {
    return false;
  }

  const centerX = xmin + width / 2;
  const centerY = ymin + height / 2;
  const nearSeattle =
    centerX >= -125 &&
    centerX <= -120 &&
    centerY >= 45 &&
    centerY <= 49.5;

  return nearSeattle;
}

function getSpatialReference(candidate) {
  const spatialReference = candidate.spatialReference;
  if (spatialReference) {
    return spatialReference;
  }

  return { wkid: 4326 };
}

export function parseCatalogExtent(value) {
  const candidate = parseExtentValue(value);
  if (!isValidExtent(candidate)) {
    return null;
  }

  return new Extent({
    xmin: candidate.xmin,
    ymin: candidate.ymin,
    xmax: candidate.xmax,
    ymax: candidate.ymax,
    spatialReference: getSpatialReference(candidate),
  });
}

export function hasUsableCatalogExtent(value) {
  return Boolean(parseCatalogExtent(value));
}

export function getDefaultSeattleView() {
  return DEFAULT_SEATTLE_VIEW;
}
