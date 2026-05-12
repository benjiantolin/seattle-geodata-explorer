export function showInspector(attributes, heading = "Attributes", extraNode = null, actions = []) {
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

  const table = document.createElement("table");
  table.style.width = "100%";

  Object.entries(attributes).forEach(([key, value]) => {
    const row = document.createElement("tr");
    const formattedValue = key === "url" && value
      ? `<a class="inspector__link" href="${value}" target="_blank" rel="noreferrer">${value}</a>`
      : value != null
        ? `${value}`
        : "—";

    row.innerHTML = `
      <td class="inspector__key">${key}</td>
      <td class="inspector__value">${formattedValue}</td>
    `;
    table.appendChild(row);
  });

  panel.appendChild(table);
}
