import { icon } from "@fortawesome/fontawesome-svg-core";

export function renderIcon(iconDefinition, options = {}) {
  return icon(iconDefinition, {
    classes: options.classes || [],
    transform: options.transform,
    styles: options.styles || {},
  }).html.join("");
}

export function setIcon(element, iconDefinition, options = {}) {
  if (!element) {
    return;
  }

  element.innerHTML = renderIcon(iconDefinition, options);
}
