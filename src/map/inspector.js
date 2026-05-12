export function showInspector(attributes, heading = "Attributes", extraNode = null) {
  const panel = document.getElementById("inspector");
  panel.style.display = "block";

  panel.innerHTML = `
    <div class="inspector__header">
      <h3>${heading}</h3>
      <button type="button" class="inspector__close">×</button>
    </div>
  `;

  const closeBtn = panel.querySelector(".inspector__close");
  closeBtn.addEventListener("click", () => {
    panel.style.display = "none";
  });

  if (extraNode) {
    panel.appendChild(extraNode);
  }

  const table = document.createElement("table");
  table.style.width = "100%";

  Object.entries(attributes).forEach(([key, value]) => {
    const row = document.createElement("tr");
    const formattedValue = key === "url"
      ? `<a href="${value}" target="_blank" rel="noreferrer">Open service</a>`
      : `${value}`;

    row.innerHTML = `
      <td class="inspector__key">${key}</td>
      <td class="inspector__value">${formattedValue}</td>
    `;
    table.appendChild(row);
  });

  panel.appendChild(table);
}
