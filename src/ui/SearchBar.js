export class SearchBar {
  constructor(onSearch) {
    this.onSearch = onSearch;
  }

  mount(parentElem) {
    const wrapper = document.createElement("div");
    wrapper.className = "search-bar";

    const input = document.createElement("input");
    input.type = "search";
    input.className = "search-bar__input";
    input.placeholder = "Search datasets...";

    input.addEventListener("input", (e) => {
      this.onSearch(e.target.value);
    });

    wrapper.appendChild(input);
    parentElem.appendChild(wrapper);
  }
}