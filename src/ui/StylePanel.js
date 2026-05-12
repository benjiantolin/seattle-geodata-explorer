export function attachStyleControls(layer) {
  const panel = document.getElementById("inspector");

  const opacity = document.createElement("input");
  opacity.type = "range";
  opacity.min = 0; opacity.max = 1; opacity.step = 0.05;
  opacity.value = layer.opacity || 1;

  opacity.addEventListener("input", () => {
    layer.opacity = Number(opacity.value);
  });

  panel.appendChild(document.createElement("hr"));
  panel.appendChild(opacity);
}