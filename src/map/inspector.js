import { escapeHtml, safeUrl } from "../utils/escapeHtml.js";

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

  panel.innerHTML = `
    <div class="inspector__header">
      <h3>${escapeHtml(heading)}</h3>
      <button type="button" class="inspector__close" aria-label="Close panel">x</button>
    </div>
  `;

  const closeBtn = panel.querySelector(".inspector__close");
  closeBtn.addEventListener("click", hideInspector);

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

  const entries = Object.entries(attributes).filter(
    ([, value]) => value != null && value !== "",
  );
  const detailList = document.createElement("div");
  detailList.className = "inspector__details";

  entries.forEach(([key, value]) => {
    const row = document.createElement("div");
    row.className = "inspector__detail-row";

    const keyCell = document.createElement("div");
    const valueCell = document.createElement("div");

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
      valueCell.textContent = String(value);
    }

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    detailList.appendChild(row);
  });

  if (entries.length) {
    panel.appendChild(detailList);
  }
}
