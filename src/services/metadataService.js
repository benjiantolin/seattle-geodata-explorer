import catalog from "../data/catalog.json";

export function searchCatalog(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    return catalog;
  }

  const searchableFields = [
    "id",
    "title",
    "description",
    "snippet",
    "owner",
    "type",
    "tags",
    "categories",
    "accessInformation",
    "licenseInfo",
    "culture",
    "url",
    "access",
    "license",
    "source",
    "extent",
    "industries",
    "created",
    "modified"
  ];

  return catalog.filter(item =>
    searchableFields.some((field) => {
      const value = item[field];
      if (value == null) {
        return false;
      }
      if (Array.isArray(value)) {
        return value.some(v => v.toString().toLowerCase().includes(q));
      }
      return value.toString().toLowerCase().includes(q);
    })
  );
}

export function getAllCatalog() {
  return catalog;
}