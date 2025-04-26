const userId = "";
const noteId = "";

const allTextColorClasses = ["text-color-white", "text-color-black", "text-color-yellow", "text-color-red", "text-color-blue", "text-color-green", "text-color-darkgreen", "text-color-darkblue", "text-color-darkred"];
const allHighlightColorClasses = ["highlight-transparent", "highlight-black", "highlight-yellow", "highlight-red", "highlight-blue", "highlight-green", "highlight-darkgreen", "highlight-darkblue", "highlight-darkred"];

const observers = {}; // "contentBlockId": observer
observerOptions = {
    attributes: true,
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: ["class", "style"],
}

const note = document.getElementById("note");
const contextmenu = document.getElementById("contextmenu_page");
const contentBlockOptions = document.getElementById("content_block_options");
const contentImageResizer = document.getElementById("content_image_resizer");

var previousMouseX = -1;

rangy.init();

window.addEventListener("dragenter", event => {
    event.preventDefault();
});

window.addEventListener("dragover", event => {
    event.preventDefault();
});

window.addEventListener("drop", event => {
    event.preventDefault();
});

window.addEventListener("paste", event => {
    // cancel paste
    event.preventDefault();

    // get text representation of clipboard
    var text = (event.originalEvent || event).clipboardData.getData('text/plain');

    // insert text manually
    document.execCommand("insertHTML", false, text);
});

document.getElementById("main").addEventListener("mousedown", event => unFocusContentBlock());
document.getElementsByClassName("note-nav")[0].addEventListener("mousedown", event => unFocusContentBlock());
document.getElementsByTagName("header")[0].addEventListener("mousedown", event => unFocusContentBlock());

function unFocusContentBlock() {
    const targetId = contentBlockOptions.dataset.targetId;
    if (targetId == "") return;
    getContentBlockWrapperChild(targetId, "content-block").classList.remove("content-block-hover");
    hideContentBlockOptions(contentBlockOptions);
}

document.addEventListener("mouseup", event => {
    const selection = window.getSelection();
    if (selection) {
        if ((selection.anchorOffset != selection.focusOffset) || (selection.anchorNode != selection.focusNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showContextmenu(rect);

            document.getElementById("main").addEventListener("scroll", mainScrollCallback);
            return;
        }
    }

    hideContextmenu();
    document.getElementById("text_color_dropdown").style.display = "none";
    document.getElementById("main").removeEventListener("scroll", mainScrollCallback);
});

function mainScrollCallback(event) {
    const selection = window.getSelection();
    if (selection) {
        if ((selection.anchorOffset != selection.focusOffset) || (selection.anchorNode != selection.focusNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showContextmenu(rect);
            return;
        }
    }

    hideContextmenu();
    document.getElementById("text_color_dropdown").style.display = "none";
    document.getElementById("main").removeEventListener("scroll", mainScrollCallback);
}

function getContentBlockWrapperChild(contentBlockId, className) {
    try {
        const childNodes = [];
        childNodes.push(document.getElementById(contentBlockId));
        while (childNodes.length > 0) {
            const tmp = childNodes.shift();
            if (tmp.classList.contains(className))
                return tmp;

            for (const child of tmp.children) {
                childNodes.push(child);
            }
        }
    } catch (exception) {
        return null;
    }
}

function getContentBlockWrapper(child) {
    var parent = child;
    try {
        while (parent.classList == null || !parent.classList.contains("content-block-wrapper")) {
            parent = parent.parentElement;
        }
        return parent;
    } catch (exception) {
        return null;
    }
}

function deleteContentBlock() {
    const targetId = contentBlockOptions.dataset.targetId;
    observers[targetId].disconnect();
    delete observers[targetId];

    hideContentBlockOptions();
    document.getElementById(targetId).remove();

    sendEditRequest("DeleteContentBlock", {
        contentBlockId: targetId,
    });
}

function justifyText(pos) {
    const targetId = contentBlockOptions.dataset.targetId;
    const contentText = getContentBlockWrapperChild(targetId, "content-text");
    contentText.style.textAlign = pos;
    if (getContentBlockWrapperChild(targetId, "content-block").dataset.type === "image") {
        const content = getContentBlockWrapperChild(targetId, "content");
        content.style.alignItems = pos;
        switch (pos) {
            case "start":
                content.style.flexDirection = "row";
                break;

            case "center":
                content.style.flexDirection = "column";
                break;

            case "end":
                content.style.flexDirection = "row-reverse";
                break;
        }
    }

    hideContentBlockOptions();
}

function setTextSize(size) {
    const targetId = contentBlockOptions.dataset.targetId;
    const contentText = getContentBlockWrapperChild(targetId, "content-text");
    contentText.style.fontSize = size;
    hideContentBlockOptions();
}

function changeSelectedTextStyle(className) {
    var sel = rangy.getSelection();
    if (sel.rangeCount > 0) {
        var allClasses = [];
        if (className.startsWith("text-color-"))
            allClasses = allTextColorClasses;
        else if (className.startsWith("highlight-"))
            allClasses = allHighlightColorClasses;
        else {
            rangy.createClassApplier(className).toggleSelection();
            return;
        }

        var classAppliers = [];
        allClasses.forEach(value => {
            classAppliers.push(rangy.createClassApplier(value));
        });

        var index = allClasses.indexOf(className);
        for (var i = 0; i < classAppliers.length; i++) {
            classAppliers[i].undoToSelection();
            if (i == index)
                classAppliers[i].applyToSelection();
        }
    }
    hideContextmenu();
}

function showContextmenu(relativeOffsets) {
    contextmenu.style.display = "flex";

    const mainDiv = document.getElementById("main");
    var x = relativeOffsets.left, y = relativeOffsets.top - contextmenu.offsetHeight;
    if (window.innerWidth - x < contextmenu.offsetWidth + 10)
        x = window.innerWidth - contextmenu.offsetWidth - 10;

    if (y < mainDiv.offsetTop)
        y = relativeOffsets.top + contextmenu.offsetHeight;
    else if (window.innerHeight - y < contextmenu.offsetHeight + 10)
        y = window.innerHeight - contextmenu.offsetHeight - 10;

    contextmenu.style.left = x + "px";
    contextmenu.style.top = y + "px";
}

function hideContextmenu(){
    contextmenu.style.display = "none";
}

function setInfo(userId, noteId) {
    this.userId = userId;
    this.noteId = noteId;
}

function showNote(resolve, reject) {
    if (this.userId == "" || this.noteId == "")
        return;

    fetch("/Main/GetNote", {
        method: "POST",
        body: JSON.stringify(this.noteId),
        headers: {
            "Content-type": "application/json"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            document.getElementById("title").value = json["noteName"];

            // append an empty block in note(only for drop file use)
            const emptyBlockWrapper = document.createElement("div");

            const emptyBlock = document.createElement("div");
            emptyBlock.className = "empty-block";

            emptyBlockWrapper.appendChild(emptyBlock);
            emptyBlockWrapper.appendChild(createContentBlockInsertDropdown());

            note.appendChild(emptyBlockWrapper);

            // make content as an element
            const contents = document.createElement("div");
            contents.innerHTML = json["content"].trim();

            // append all functions for contentBlock
            while (contents.childElementCount > 0) {
                const child = contents.children[0];
                child.insertBefore(createDragBlock(), child.childNodes[0]);
                child.appendChild(createOptionBlock());

                const id = child.id;
                child.id = "";

                const contentBlockWrapper = document.createElement("div");
                contentBlockWrapper.id = id
                contentBlockWrapper.classList.add("content-block-wrapper");
                contentBlockWrapper.appendChild(child);
                contentBlockWrapper.appendChild(createContentBlockInsertDropdown());

                note.appendChild(contentBlockWrapper);
            }

            document.getElementById(json["noteId"]).parentElement.style.background = "#656565ff"; // show as selected

            resolve("ok");
        })
}

function getContentBlockIndex(contentBlockId) {
    // start with 1 because index 0 is empty block
    var index = 1;
    for (const child of note.children) {
        if (child.id === contentBlockId)
            break;
        index++;
    }
    return index;
}

function initNote() {
    // init Sortable
    Sortable.create(note, {
        disabled: false, // Disables the sortable if set to true.
        animation: 150,  // ms, animation speed moving items when sorting, `0` — without animation
        handle: ".drag-block",  // Drag handle selector within list items
        draggable: ".content-block-wrapper",  // Specifies which items inside the element should be draggable
        filter: "", // Selectors that do not lead to dragging (String or Function)

        // Element dragging ended
        onEnd: async event => {
            // -1 index because there is an empty block at index 0
            await sendEditRequest("ContentBlockOrder", {
                contentBlockOldIndex: event.oldIndex - 1,
                contentBlockNewIndex: event.newIndex - 1,
            });
        },
    });

    // init file drop behavior
    for (const child of note.children) {
        initDragDrop(child);
    }

    // init content-image-resizer behavior
    contentImageResizer.addEventListener("mouseenter", event => {
        contentImageResizer.style.display = "block";
    });

    contentImageResizer.addEventListener("mouseleave", event => {
        hideContentImageResizer();
    });

    contentImageResizer.addEventListener("mousedown", event => {
        previousMouseX = event.clientX;
        getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-text").style.width = "auto";

        for (const contentImage of document.getElementsByClassName("content-image")) {
            contentImage.removeEventListener("mouseenter", contentImageMouseenterCallback);
        }

        window.addEventListener("mousemove", windowMousemoveCallback);
        window.addEventListener("mouseup", windowMouseupCallback);
    });

    // init content-image behavior
    for (const contentImage of document.getElementsByClassName("content-image")) {
        initContentImage(contentImage);
    }
}

function initDragDrop(contentBlockWrapper) {
    contentBlockWrapper.addEventListener("dragover", event => {
        event.preventDefault();
        contentBlockWrapper.classList.add("insert-line");
    });

    contentBlockWrapper.addEventListener("dragleave", event => {
        contentBlockWrapper.classList.remove("insert-line");
    });

    contentBlockWrapper.addEventListener("drop", async (event) => {
        event.preventDefault();

        contentBlockWrapper.classList.remove("insert-line");

        for (const file of event.dataTransfer.files) {
            if (file.type.includes("image/")) {
                const contentBlockWrapperNew = await insertNewContentBlockWrapper("image", getContentBlockIndex(contentBlockWrapper.id));
                uploadFile(file, contentBlockWrapperNew.id)
                    .then(json => {
                        getContentBlockWrapperChild(contentBlockWrapperNew.id, "content-image").src = json["filePath"];
                    })
                    .catch(json => {
                        alert("File upload failed: " + json["errorMsg"]);
                    });
            }
        }
    });
}

function initContentImage(contentImage) {
    contentImage.addEventListener("mouseenter", contentImageMouseenterCallback);

    contentImage.addEventListener("mousemove", event => {
        showContentImageResizer();
    });

    contentImage.addEventListener("mouseleave", event => {
        hideContentImageResizer();
        document.getElementById("main").removeEventListener("scroll", showContentImageResizer);
    });
}

function showContentImageResizer() {
    contentImageResizer.style.display = "block";

    const imageOffsets = getOffset(getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-image"));
    contentImageResizer.style.left = (imageOffsets.left + imageOffsets.width - contentImageResizer.offsetWidth - 2) + "px";
    contentImageResizer.style.top = (imageOffsets.top + imageOffsets.height - contentImageResizer.offsetHeight - 2) + "px";

    if (contentImageResizer.offsetTop + contentImageResizer.offsetHeight > window.innerHeight)
        contentImageResizer.style.display = "none";
}

function hideContentImageResizer() {
    contentImageResizer.style.display = "none";
}

function uploadFile(file, contentBlockId) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("NoteId", this.noteId);
        formData.append("ContentBlockId", contentBlockId);
        formData.append("File", file);
        fetch("/Main/UploadFile", {
            method: "POST",
            body: formData,
        })
            .then((response) => response.json())
            .then((json) => {
                //console.log(json);
                if (json["isSuccessed"])
                    resolve(json);
                else
                    reject(json);
            })
    });
}

function contentImageMouseenterCallback(event) {
    contentImageResizer.dataset.targetId = getContentBlockWrapper(event.currentTarget).id;
    showContentImageResizer();
    document.getElementById("main").addEventListener("scroll", showContentImageResizer);
}

function windowMousemoveCallback(event) {
    const targetImage = getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-image");

    const moveRangeX = event.clientX - previousMouseX;
    previousMouseX = event.clientX;

    targetImage.width += moveRangeX;
    const imageOffsets = getOffset(targetImage);
    contentImageResizer.style.left = (imageOffsets.left + targetImage.width - contentImageResizer.offsetWidth - 2) + "px";
    contentImageResizer.style.top = (imageOffsets.top + targetImage.height - contentImageResizer.offsetHeight - 2) + "px";
}

function windowMouseupCallback(event) {
    previousMouseX = -1;
    contentImageResizer.style.display = "none";
    window.removeEventListener("mousemove", windowMousemoveCallback);
    window.removeEventListener("mouseup", windowMouseupCallback);

    getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-text").style.width = "100%";

    sendEditRequest("Content", {
        contentBlockId: contentImageResizer.dataset.targetId,
        content: getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content").outerHTML,
    });

    for (const contentImage of document.getElementsByClassName("content-image")) {
        contentImage.addEventListener("mouseenter", contentImageMouseenterCallback);
    }
}

function startAutoSave() {
    document.getElementById("title").addEventListener("change", (event) => {
        var noteName = document.getElementById("title").value;
        if (noteName == "")
            noteName = "Untitled";

        document.getElementById(this.noteId).innerText = noteName;
        sendEditRequest("Name", {
            noteName: noteName,
        });
    });

    for (const child of note.children) {
        if (!child.classList.contains("content-block-wrapper"))
            continue;
        
        // add observer to content
        const observer = new MutationObserver(observerCallback);
        observer.observe(getContentBlockWrapperChild(child.id, "content"), observerOptions);
        observers[child.id] = observer;
    }
}

async function observerCallback(mutationsList, observer) {
    var targets = {};
    mutationsList.forEach(value => {
        try {
            const target = getContentBlockWrapper(value.target);
            targets[target.id] = getContentBlockWrapperChild(target.id, "content").outerHTML;
        } catch (error) {
            console.log(error);
        }
    });
    for (const [key, value] of Object.entries(targets)) {
        await sendEditRequest("Content", {
            contentBlockId: key,
            content: value,
        });
    }
}

function sendEditRequest(editType, { noteName = "", contentBlockId = "", contentBlockType = "", content = "", contentBlockOldIndex = -1, contentBlockNewIndex = -1 }) {
    return new Promise((resolve, reject) => {
        fetch("/Main/EditNote", {
            method: "POST",
            body: JSON.stringify({
                UserId: this.userId,
                NoteId: this.noteId,
                EditType: editType,
                NoteName: noteName,
                ContentBlockId: contentBlockId,
                ContentBlockType: contentBlockType,
                Content: content,
                ContentBlockOldIndex: contentBlockOldIndex,
                ContentBlockNewIndex: contentBlockNewIndex,
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((json) => {
                //console.log(json);
                if (json["isSuccessed"])
                    resolve(json);
                else
                    reject(json);
            })
    });
}

async function newContentBlockWrapper(type) {
    const surDate = new Date()
    const id = "CB" + surDate.getTime();

    const contentBlock = document.createElement("div");
    contentBlock.classList.add("content-block");
    contentBlock.setAttribute("tabindex", "-1");
    contentBlock.dataset.type = type;

    const content = document.createElement("div");
    content.classList.add("content");

    const contentText = document.createElement("div");
    contentText.contentEditable = "true";
    contentText.classList.add("content-text");
    if (type == "image") {
        const image = document.createElement("img");
        image.src = "/assets/loading-spinner.gif";
        image.width = 300;
        image.setAttribute("draggable", "false");
        image.classList.add("content-image");
        content.appendChild(image);

        initContentImage(image);
    }
    content.appendChild(contentText);

    contentBlock.appendChild(createDragBlock());
    contentBlock.appendChild(content);
    contentBlock.appendChild(createOptionBlock());

    const contentBlockWrapper = document.createElement("div");
    contentBlockWrapper.id = id;
    contentBlockWrapper.classList.add("content-block-wrapper");
    contentBlockWrapper.appendChild(contentBlock);
    contentBlockWrapper.appendChild(createContentBlockInsertDropdown());
    initDragDrop(contentBlockWrapper);

    const responseJson = await sendEditRequest("AddContentBlock", {
        contentBlockId: id,
        contentBlockType: type,
    });

    if (!responseJson["isSuccessed"])
        return null;

    note.appendChild(contentBlockWrapper);

    // add observer to content
    const observer = new MutationObserver(observerCallback);
    observer.observe(content, observerOptions);
    observers[id] = observer;

    return contentBlockWrapper;
}

async function insertNewContentBlockWrapper(type, index) {
    const contentBlockWrapperNew = await newContentBlockWrapper(type)
    if (contentBlockWrapperNew == null)
        return null;
        
    const oldIndex = note.childElementCount - 1;
    const newIndex = index;

    note.children[newIndex - 1].after(note.children[oldIndex]);

    // -1 index because there is an empty block at index 0
    const respone = await sendEditRequest("ContentBlockOrder", {
        contentBlockOldIndex: oldIndex - 1,
        contentBlockNewIndex: newIndex - 1,
    })

    if (type === "text") {
        getContentBlockWrapperChild(note.children[index].id, "content-block-insert-dropdown-items").classList.remove("content-block-insert-dropdown-items-show");
        getContentBlockWrapperChild(note.children[newIndex].id, "content-block").classList.add("content-block-hover");
        contentBlockOptions.dataset.targetId = note.children[newIndex].id;
    }
    return contentBlockWrapperNew;
}

function toggleContentBlockInsertDropdownItems(dropdownItems) {
    if (dropdownItems.classList.contains("content-block-insert-dropdown-items-show"))
        dropdownItems.classList.remove("content-block-insert-dropdown-items-show");
    else
        dropdownItems.classList.add("content-block-insert-dropdown-items-show");
}

function createDragBlock() {
    const dragBlock = document.createElement("div");
    dragBlock.className = "drag-block";
    dragBlock.innerHTML = "<img draggable=\"false\" src=\"/assets/bars-solid.svg\"/>";
    return dragBlock;
}

function createOptionBlock() {
    const optionBlock = document.createElement("div");
    optionBlock.className = "option-block";
    optionBlock.innerHTML = "<img draggable=\"false\" src=\"/assets/ellipsis-vertical-solid.svg\"/>";
    optionBlock.setAttribute("onclick", "showContentBlockOptions(this)");
    return optionBlock;
}

function createContentBlockInsertDropdown() {
    const contentBlockInsertDropdown = document.createElement("div");
    contentBlockInsertDropdown.classList.add("content-block-insert-dropdown");
    contentBlockInsertDropdown.addEventListener("mouseleave", event => {
        event.currentTarget.children[1].classList.remove("content-block-insert-dropdown-items-show");
    });

    // create dropdown button
    const contentBlockInsertDropdownButton = document.createElement("button");
    contentBlockInsertDropdownButton.classList.add("content-block-insert-dropdown-button");
    contentBlockInsertDropdownButton.title = "New block";
    contentBlockInsertDropdownButton.addEventListener("click", event => {
        toggleContentBlockInsertDropdownItems(event.currentTarget.parentElement.children[1]);
    });

    contentBlockInsertDropdown.appendChild(contentBlockInsertDropdownButton);

    const icon = document.createElement("i");
    icon.classList.add("bi");
    icon.classList.add("bi-plus-lg");

    contentBlockInsertDropdownButton.appendChild(icon);

    // create dropdown items
    const contentBlockInsertDropdownItems = document.createElement("div");
    contentBlockInsertDropdownItems.classList.add("content-block-insert-dropdown-items");

    // create new text contentBlock button
    const newContentBlockTextButton = createNewContentBlockButton("text", "Text", "bi bi-fonts")
    contentBlockInsertDropdownItems.appendChild(newContentBlockTextButton);

    // create new image contentBlock button
    const newContentBlockImageButton = createNewContentBlockButton("image", "Image", "bi bi-image")
    contentBlockInsertDropdownItems.appendChild(newContentBlockImageButton);

    contentBlockInsertDropdown.appendChild(contentBlockInsertDropdownItems);

    return contentBlockInsertDropdown;
}

function createNewContentBlockButton(type, innerText, iconClassName) {
    const button = document.createElement("button");
    var callback;
    switch (type) {
        case "text":
            callback = (event) => {
                const contentBlockWrapper = getContentBlockWrapper(button);
                if (contentBlockWrapper == null)
                    insertNewContentBlockWrapper(type, 1); // index 0 is an empty block
                else
                    insertNewContentBlockWrapper(type, getContentBlockIndex(contentBlockWrapper.id));
            };
            break;

        case "image":
            callback = (event) => {
                const input = document.createElement("input");
                input.type = "file";
                input.setAttribute("multiple", "");
                input.setAttribute("accept", "image/*");
                input.addEventListener("change", async event => {
                    for (const file of event.target.files) {
                        const contentBlockWrapperNew = await insertNewContentBlockWrapper(type, getContentBlockIndex(getContentBlockWrapper(button).id));
                        if (contentBlockWrapperNew != null) {
                            uploadFile(file, contentBlockWrapperNew.id)
                                .then(json => {
                                    getContentBlockWrapperChild(contentBlockWrapperNew.id, "content-image").src = json["filePath"];
                                })
                                .catch(json => {
                                    alert("File upload failed: " + json["errorMsg"]);
                                });
                        }
                    }
                });
                input.click();
            };
            break;
    }
    button.addEventListener("click", callback);

    const icon = document.createElement("i");
    icon.className = iconClassName;
    button.appendChild(icon);

    const span = document.createElement("span");
    span.innerText = innerText;
    button.appendChild(span);

    return button;
}

function showContentBlockOptions(sender) {
    contentBlockOptions.style.display = "flex";

    var windowInnerHeight = window.innerHeight;
    var optionBlockOffsets = getOffset(sender);
    if (windowInnerHeight - optionBlockOffsets.height - optionBlockOffsets.top <= contentBlockOptions.offsetHeight)
        contentBlockOptions.style.top = (optionBlockOffsets.top - contentBlockOptions.offsetHeight) + "px";
    else
        contentBlockOptions.style.top = (optionBlockOffsets.top + optionBlockOffsets.height) + "px";
    contentBlockOptions.style.left = (window.innerWidth - contentBlockOptions.offsetWidth - 20) + "px";

    sender.parentElement.classList.add("content-block-hover");

    contentBlockOptions.dataset.targetId = getContentBlockWrapper(sender).id;
}

function hideContentBlockOptions() {
    contentBlockOptions.style.display = "none";
    if (contentBlockOptions.dataset.targetId != "") {
        document.getElementById(contentBlockOptions.dataset.targetId).classList.remove("content-block-hover");
        contentBlockOptions.dataset.targetId = "";
    }
}

function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: el.offsetWidth,
        height: el.offsetHeight,
    };
}

function toggleTextColorDropdownDisplay() {
    const dropdown = document.getElementById("text_color_dropdown");
    const dropdownIcon = document.getElementById("text_color_dropdown_icon");
    if (dropdown.style.display == "block")
        dropdown.style.display = "none";
    else {
        dropdown.style.display = "block";
        dropdown.style.top = "55px";

        var height = document.getElementById("main").offsetHeight;
        var top = contextmenu.offsetTop;
        if (height - top <= dropdown.offsetHeight)
            dropdown.style.top = (-5 - dropdown.offsetHeight) + "px";
    }
}