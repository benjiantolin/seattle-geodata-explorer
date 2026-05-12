import { escapeHtml, safeUrl } from "../utils/escapeHtml.js";

export function showInspector(attributes, heading = "Attributes", extraNode = null, actions = []) {
  const panel = document.getElementById("inspector");
  panel.style.display = "block";

  panel.innerHTML = `
    <div class="inspector__header">
      <h3>${escapeHtml(heading)}</h3>
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
    const keyCell = document.createElement("td");
    const valueCell = document.createElement("td");

    keyCell.className = "inspector__key";
    valueCell.className = "inspector__value";

    keyCell.textContent = key;

    const cleanUrl = key === "url" ? safeUrl(value) : "";

    if (cleanUrl) {
      const link = document.createElement("a");
      link.className = "inspector__link";
      link.href = cleanUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = cleanUrl;
      valueCell.appendChild(link);
    } else {
      valueCell.textContent = value != null ? String(value) : "—";
    }

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    table.appendChild(row);
  });

  panel.appendChild(table);
}