export function createLayerCard(meta, actions = {}, options = {}) {
  const div = document.createElement("div");
  div.className = "layer-card";
  if (options.active) {
    div.classList.add("layer-card--active");
  }

  div.innerHTML = `
    <div class="layer-card__info">
      <strong class="layer-card__title">${meta.title}</strong>
      <div class="layer-card__subtitle">${meta.type}</div>
      <div class="layer-card__meta">${meta.owner || ""}</div>
    </div>
    <div class="layer-card__buttons"></div>
  `;

  const buttonContainer = div.querySelector(".layer-card__buttons");

  if (options.primaryText) {
    const primary = document.createElement("button");
    primary.className = "layer-card__button layer-card__button--primary";
    primary.textContent = options.primaryText;
    primary.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.primary?.(meta);
    });
    buttonContainer.appendChild(primary);
  }

  if (options.secondaryText) {
    const secondary = document.createElement("button");
    secondary.className = "layer-card__button layer-card__button--secondary";
    secondary.textContent = options.secondaryText;
    secondary.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.secondary?.(meta);
    });
    buttonContainer.appendChild(secondary);
  }

  if (options.tertiaryText) {
    const tertiary = document.createElement("button");
    tertiary.className = "layer-card__button layer-card__button--secondary";
    tertiary.textContent = options.tertiaryText;
    tertiary.addEventListener("click", (event) => {
      event.stopPropagation();
      actions.tertiary?.(meta);
    });
    buttonContainer.appendChild(tertiary);
  }

  if (typeof options.onCardClick === "function") {
    div.addEventListener("click", () => options.onCardClick(meta));
  }

  return div;
}