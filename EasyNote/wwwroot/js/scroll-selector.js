class ScrollSelector {
    #scrollSelector = null;
    #itemContainer = null;
    #selectedIndex = 0;
    #itemList = [];
    #itemHeight = 45;
    #selectedColor = "#57a39a";
    #notSelectedColor = "#adadad";
    #backgroundColor = "#ffffff";
    #buttonIconColor = "#656565";
    #buttonIconHoverColor = "#fff";
    #buttonHoverColor = "#b5b5b5";
    #upBtn = null;
    #downBtn = null;
    onSelectedIndexChange = (selectedIndex) => { };

    constructor() {
        Object.defineProperty(this, "scrollSelector", {
            get: () => { return this.#scrollSelector; },
            set: (v) => { throw new Error("scrollSelector is not settable.") }
        });

        Object.defineProperty(this, "itemContainer", {
            get: () => { return this.#itemContainer; },
            set: (v) => { throw new Error("itemContainer is not settable.") }
        });

        Object.defineProperty(this, "selectedIndex", {
            get: () => { return this.#selectedIndex; },
            set: (v) => { throw new Error("selectedIndex is not settable.") }
        });

        Object.defineProperty(this, "itemList", {
            get: () => { return this.#itemList; },
            set: (v) => { throw new Error("itemList is not settable.") }
        });

        Object.defineProperty(this, "itemHeight", {
            get: () => { return this.#itemHeight; },
            set: (v) => {
                if (typeof v !== "number") { throw new Error("itemHeight is number.") }
                this.#itemHeight = v;
                if (this.#itemContainer != null) {
                    for (const child of this.#itemContainer.children) {
                        child.style.height = this.#itemHeight + "px";
                    }
                }
            }
        });

        Object.defineProperty(this, "selectedColor", {
            get: () => { return this.#selectedColor; },
            set: (v) => {
                if (typeof v !== "string") { throw new Error("backgroundColor is string.") }

                this.#selectedColor = v;
                if (this.#itemContainer != null)
                    this.#itemContainer.children[this.#selectedIndex].style.color = this.#selectedColor;
            }
        });

        Object.defineProperty(this, "notSelectedColor", {
            get: () => { return this.#notSelectedColor; },
            set: (v) => {
                if (typeof v !== "string") { throw new Error("backgroundColor is string.") }

                this.#notSelectedColor = v;
                if (this.#itemContainer != null) {
                    for (let i = 0; i < this.#itemContainer.children.length; i++) {
                        if (i !== this.#selectedIndex)
                            this.#itemContainer.children[i].style.color = this.#notSelectedColor;
                    }
                }
            }
        });

        Object.defineProperty(this, "backgroundColor", {
            get: () => { return this.#backgroundColor; },
            set: (v) => {
                if (typeof v !== "string") { throw new Error("backgroundColor is string.") }

                this.#backgroundColor = v;
                if (this.#scrollSelector != null) {
                    this.#scrollSelector.style.background = this.#backgroundColor;
                    if (this.#upBtn != null) {
                        this.#upBtn.style.background = this.#backgroundColor;
                        this.#downBtn.style.background = this.#backgroundColor;
                    }
                }
            }
        });

        Object.defineProperty(this, "buttonIconColor", {
            get: () => { return this.#buttonIconColor; },
            set: (v) => {
                if (typeof v !== "string") { throw new Error("buttonIconColor is string.") }

                this.#buttonIconColor = v;
                if (this.#upBtn != null) {
                    this.#upBtn.style.color = this.#buttonIconColor;
                    this.#downBtn.style.color = this.#buttonIconColor;
                }
            }
        });

        Object.defineProperty(this, "buttonIconHoverColor", {
            get: () => { return this.#buttonIconHoverColor; },
            set: (v) => {
                if (typeof v !== "string") { throw new Error("buttonIconHoverColor is string.") }

                this.#buttonIconHoverColor = v;
            }
        });

        Object.defineProperty(this, "buttonHoverColor", {
            get: () => { return this.#buttonHoverColor; },
            set: (v) => {
                if (typeof v !== "string") { throw new Error("buttonHoverColor is string.") }

                this.#buttonHoverColor = v;
            }
        });
    }

    create(itemList, withButton = true) {
        if (itemList == null || itemList.length === 0)
            return null;

        this.#itemList = itemList;
        this.#selectedIndex = 0;

        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "center";
        container.style.width = "100%";
        container.style.height = "100%";

        if (withButton) {
            this.#upBtn = this.#createScrollButton("up");
            container.appendChild(this.#upBtn);
        }

        // create scrollSelector
        this.#scrollSelector = document.createElement("div");
        this.#scrollSelector.style.width = "100%";
        this.#scrollSelector.style.height = "100%";
        this.#scrollSelector.style.overflowY = "clip";
        this.#scrollSelector.style.boxSizing = "border-box";
        this.#scrollSelector.addEventListener("wheel", (event) => {
            let top = Number(this.#itemContainer.style.top.split("px")[0]);
            if (event.deltaY > 0 && top * -1 < this.#itemContainer.offsetHeight - this.#itemHeight)
                this.select(this.#selectedIndex + 1);
            else if (event.deltaY < 0 && top < 0)
                this.select(this.#selectedIndex - 1);
        });

        // create items
        this.#itemContainer = document.createElement("div");
        this.#itemContainer.style.position = "relative";
        this.#itemContainer.style.display = "flex";
        this.#itemContainer.style.flexDirection = "column";
        this.#itemContainer.style.width = "100%";
        this.#itemContainer.style.left = "0";
        this.#itemContainer.style.top = "0";
        this.#itemContainer.style.transition = "0.3s";
        for (let i = 0; i < itemList.length; i++) {
            const item = document.createElement("div");
            item.innerText = itemList[i];
            item.style.fontSize = (this.#itemHeight - 10) + "px";
            item.style.fontWeight = "900";
            item.style.height = this.#itemHeight + "px";
            item.style.textAlign = "center";
            item.style.alignContent = "center";
            item.style.userSelect = "none";
            item.style.color = this.#notSelectedColor;
            this.#itemContainer.appendChild(item);
        }
        this.#itemContainer.children[this.#selectedIndex].style.color = this.#selectedColor;
        this.#scrollSelector.appendChild(this.#itemContainer);
        container.appendChild(this.#scrollSelector)

        if (withButton) {
            this.#downBtn = this.#createScrollButton("down");
            container.appendChild(this.#downBtn);
        }

        // init an observer that will trigger when scrollSelector been shown on the screen
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.#scrollSelector.style.height = (this.#scrollSelector.offsetHeight - this.#upBtn.offsetHeight - this.#downBtn.offsetHeight - Number(this.#upBtn.style.marginTop.split("px")[0]) - Number(this.#downBtn.style.marginBottom.split("px")[0])) + "px";
                    this.#itemContainer.style.transform = "translateY(" + (this.#scrollSelector.offsetHeight / 2 - this.#itemHeight / 2) + "px)";
                }
            });
        });
        observer.observe(this.#scrollSelector);

        return container;
    }

    #createScrollButton(type) {
        const btn = document.createElement("button");
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.width = "90%";
        btn.style.border = "none";
        btn.style.borderRadius = "5px";
        btn.style.background = this.#backgroundColor;
        btn.style.color = this.#buttonIconColor;
        btn.style.transition = "0.3s";
        if (type === "up") {
            btn.style.marginTop = "5px";
            btn.innerHTML =
                "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"30\" height=\"30\" fill=\"currentColor\" class=\"bi bi-chevron-compact-up\" viewBox=\"0 0 16 16\">\n" +
                "  <path fill-rule=\"evenodd\" d=\"M7.776 5.553a.5.5 0 0 1 .448 0l6 3a.5.5 0 1 1-.448.894L8 6.56 2.224 9.447a.5.5 0 1 1-.448-.894z\"/>\n" +
                "</svg>";

            btn.addEventListener("click", (event) => {
                this.select(this.#selectedIndex - 1);
            })
        }
        else {
            btn.style.marginBottom = "5px";
            btn.innerHTML =
                "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"30\" height=\"30\" fill=\"currentColor\" class=\"bi bi-chevron-compact-down\" viewBox=\"0 0 16 16\">\n" +
                "  <path fill-rule=\"evenodd\" d=\"M1.553 6.776a.5.5 0 0 1 .67-.223L8 9.44l5.776-2.888a.5.5 0 1 1 .448.894l-6 3a.5.5 0 0 1-.448 0l-6-3a.5.5 0 0 1-.223-.67\"/>\n" +
                "</svg>"

            btn.addEventListener("click", (event) => {
                this.select(this.#selectedIndex + 1);
            })
        }

        btn.addEventListener("focus", (event) => {
            btn.style.outline = "none";
        })
        btn.addEventListener("mouseover", (event) => {
            btn.style.background = this.#buttonHoverColor;
            btn.style.color = this.#buttonIconHoverColor;
        })
        btn.addEventListener("mouseleave", (event) => {
            btn.style.background = this.#backgroundColor;
            btn.style.color = this.#buttonIconColor;
        })
        return btn;
    }

    select(index) {
        if (index >= 0 && index < this.#itemList.length) {
            this.#itemContainer.children[this.#selectedIndex].style.color = this.#notSelectedColor;
            this.#selectedIndex = index;
            this.#itemContainer.children[this.#selectedIndex].style.color = this.#selectedColor;

            this.#itemContainer.style.top = (-1 * index * this.#itemHeight) + "px";

            this.onSelectedIndexChange(this.#selectedIndex);
        }
    }
}