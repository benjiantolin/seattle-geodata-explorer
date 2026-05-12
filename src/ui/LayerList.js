export class LayerList {
  constructor(parent, createItem) {
    this.parent = parent;
    this.createItem = createItem;
  }

  render(list) {
    this.parent.innerHTML = "";
    list.forEach(item => {
      this.parent.appendChild(this.createItem(item));
    });
  }
}