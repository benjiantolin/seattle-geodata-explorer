import catalog from "../data/catalog.json";

export function searchCatalog(query) {
  const q = query.toLowerCase();
  return catalog.filter(item =>
    item.title.toLowerCase().includes(q) ||
    (item.description && item.description.toLowerCase().includes(q)) ||
    (item.owner && item.owner.toLowerCase().includes(q)) ||
    (item.categories && item.categories.toLowerCase().includes(q))
  );
}

export function getAllCatalog() {
  return catalog;
}