export async function fetchLayerInfo(url) {
  const response = await fetch(`${url}?f=json`);
  return response.json();
}