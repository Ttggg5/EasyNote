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
    const contentBlockOptions = document.getElementById("content_block_options");
    const targetId = contentBlockOptions.dataset.targetId;
    if (targetId == "") return;
    document.getElementById(targetId).classList.remove("content-block-hover");
    hideContentBlockOptions(contentBlockOptions);
}

document.addEventListener("mouseup", event => {
    const contextmenuPage = document.getElementById("contextmenu_page");
    const selection = window.getSelection();
    if (selection) {
        if ((selection.anchorOffset != selection.focusOffset) || (selection.anchorNode != selection.focusNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showContextmenu(contextmenuPage, rect);

            document.getElementById("main").addEventListener("scroll", showContextmenu(contextmenuPage, rect));
            return;
        }
    }

    hideContextmenu();
    document.getElementById("text_color_dropdown").style.display = "none";
});

function getContentBlockChildNode(contentBlockId, className) {
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

function deleteContentBlock() {
    const targetId = document.getElementById("content_block_options").dataset.targetId;
    observers[targetId].disconnect();
    delete observers[targetId];

    hideContentBlockOptions();
    document.getElementById(targetId).remove();

    sendEditRequest("DeleteContentBlock", {
        contentBlockId: targetId,
    });
}

function justifyText(pos) {
    const targetId = document.getElementById("content_block_options").dataset.targetId;
    const contentText = getContentBlockChildNode(targetId, "content-text");
    contentText.style.textAlign = pos;
    if (document.getElementById(targetId).dataset.type === "image") {
        const content = getContentBlockChildNode(targetId, "content");
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
    const targetId = document.getElementById("content_block_options").dataset.targetId;
    const contentText = getContentBlockChildNode(targetId, "content-text");
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

function showContextmenu(target, relativeOffsets) {
    target.style.display = "flex";

    const mainDiv = document.getElementById("main");
    var x = relativeOffsets.left, y = relativeOffsets.top - target.offsetHeight;
    if (window.innerWidth - x < target.offsetWidth + 10)
        x = window.innerWidth - target.offsetWidth - 10;

    if (y < mainDiv.offsetTop)
        y = relativeOffsets.top + target.offsetHeight;
    else if (window.innerHeight - y < target.offsetHeight + 10)
        y = window.innerHeight - target.offsetHeight - 10;

    target.style.left = x + "px";
    target.style.top = y + "px";
}

function hideContextmenu(){
    document.getElementById("contextmenu_page").style.display = "none";
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

            const note = document.getElementById("note");
            note.insertAdjacentHTML("beforeend", json["content"]);
            for (const child of note.children) {
                child.insertBefore(createDragBlock(), child.childNodes[0]);
                child.appendChild(createOptionBlock());
            }

            // append an empty block in note(only for drop file use)
            const emptyBlock = document.createElement("div");
            emptyBlock.className = "empty-block";
            note.insertBefore(emptyBlock, note.childNodes[0]);

            document.getElementById(json["noteId"]).parentElement.style.background = "#656565ff"; // show as selected

            resolve("ok");
        })
}

function initNote() {
    const note = document.getElementById("note");

    // init Sortable
    Sortable.create(note, {
        disabled: false,
        animation: 150,  // the element's move animation time(ms)
        handle: ".drag-block",  // the element that is draggable
        draggable: ".content-block",  // the element that will drag with handle

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
        child.addEventListener("dragover", event => {
            event.preventDefault();
            child.classList.add("insert-line");
        });

        child.addEventListener("dragleave", event => {
            child.classList.remove("insert-line");
        });

        child.addEventListener("drop", async (event) => {
            event.preventDefault();

            child.classList.remove("insert-line");

            for (const file of event.dataTransfer.files) {
                if (file.type.includes("image/")) {
                    const contentBlock = await newBlock("image");

                    var oldIndex = note.children.length - 1;
                    var newIndex = 1;
                    for (const c of note.children) {
                        if (c.id === child.id)
                            break;
                        newIndex++;
                    }

                    note.children[newIndex - 1].after(note.children[oldIndex]);
                    // -1 index because there is an empty block at index 0
                    sendEditRequest("ContentBlockOrder", {
                        contentBlockOldIndex: oldIndex - 1,
                        contentBlockNewIndex: newIndex - 1,
                    })
                        .then(json => {
                            uploadFile(file, contentBlock.id)
                                .then(json => {
                                    getContentBlockChildNode(contentBlock.id, "content-image").src = json["filePath"];
                                })
                                .catch(json => {
                                    alert(json["errorMsg"]);
                                });
                        });
                }
            }
        });
    }

    // init content-image-resizer behavior
    contentImageResizer.addEventListener("mouseenter", event => {
        contentImageResizer.style.display = "block";
        //document.getElementById("main").addEventListener("scroll", mainScrollCallback);
    });

    contentImageResizer.addEventListener("mouseleave", event => {
        hideContentImageResizer();
        //document.getElementById("main").removeEventListener("scroll", mainScrollCallback);
    });

    contentImageResizer.addEventListener("mousedown", event => {
        previousMouseX = event.clientX;
        getContentBlockChildNode(contentImageResizer.dataset.targetId, "content-text").style.width = "auto";
        window.addEventListener("mousemove", windowMousemoveCallback);
        window.addEventListener("mouseup", windowMouseupCallback);
    });

    // init content-image behavior
    for (const contentImage of document.getElementsByClassName("content-image")) {
        initContentImage(contentImage);
    }
}

function initContentImage(contentImage) {
    contentImage.addEventListener("mouseenter", event => {
        showContentImageResizer(contentImage);
        document.getElementById("main").addEventListener("scroll", mainScrollCallback);
    });

    contentImage.addEventListener("mousemove", event => {
        showContentImageResizer(contentImage);
    });

    contentImage.addEventListener("mouseleave", event => {
        hideContentImageResizer();
        document.getElementById("main").removeEventListener("scroll", mainScrollCallback);
    });
}

function showContentImageResizer(relativeImage) {
    contentImageResizer.dataset.targetId = relativeImage.parentElement.parentElement.id;
    contentImageResizer.style.display = "block";

    const imageOffsets = getOffset(relativeImage);
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

function mainScrollCallback(event) {
    showContentImageResizer(getContentBlockChildNode(contentImageResizer.dataset.targetId, "content-image"));
}

function windowMousemoveCallback(event) {
    const targetImage = getContentBlockChildNode(contentImageResizer.dataset.targetId, "content-image");

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

    getContentBlockChildNode(contentImageResizer.dataset.targetId, "content-text").style.width = "100%";

    sendEditRequest("Content", {
        contentBlockId: contentImageResizer.dataset.targetId,
        content: getContentBlockChildNode(contentImageResizer.dataset.targetId, "content").outerHTML,
    });
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

    const note = document.getElementById("note");
    for (const child of note.children) {
        if (!child.classList.contains("content-block"))
            continue;
        
        // add observer to content
        const observer = new MutationObserver(observerCallback);
        observer.observe(getContentBlockChildNode(child.id, "content"), observerOptions);
        observers[child.id] = observer;
    }
}

async function observerCallback(mutationsList, observer) {
    var targets = {};
    mutationsList.forEach(value => {
        var targetNode = value.target;
        try {
            while (!targetNode.parentElement.classList.contains("content-block")) {
                targetNode = targetNode.parentElement;
            }
            targets[targetNode.parentNode.id] = targetNode.outerHTML;
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

async function newBlock(type) {
    const surDate = new Date()
    const id = "CB" + surDate.getTime();

    const contentBlock = document.createElement("div");
    contentBlock.classList.add("content-block");
    contentBlock.id = id;
    contentBlock.setAttribute("tabindex", "-1");
    contentBlock.dataset.type = type;

    const content = document.createElement("div");
    content.classList.add("content");

    const contentText = document.createElement("div");
    contentText.contentEditable = "true";
    contentText.classList.add("content-text");
    if (type == "image") {
        contentBlock.classList.add("content-block-image");

        const image = document.createElement("img");
        image.src = "/assets/loading_spinner.gif";
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

    document.getElementById("note").appendChild(contentBlock);

    // add observer to content
    const observer = new MutationObserver(observerCallback);
    observer.observe(content, observerOptions);
    observers[id] = observer;

    await sendEditRequest("AddContentBlock", {
        contentBlockId: id,
        contentBlockType: type,
    });

    return contentBlock;
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

function showContentBlockOptions(sender) {
    const contentBlockOptions = document.getElementById("content_block_options");
    contentBlockOptions.style.display = "flex";

    var windowInnerHeight = window.innerHeight;
    var optionBlockOffsets = getOffset(sender);
    if (windowInnerHeight - optionBlockOffsets.height - optionBlockOffsets.top <= contentBlockOptions.offsetHeight)
        contentBlockOptions.style.top = (optionBlockOffsets.top - contentBlockOptions.offsetHeight) + "px";
    else
        contentBlockOptions.style.top = (optionBlockOffsets.top + optionBlockOffsets.height) + "px";
    contentBlockOptions.style.left = (window.innerWidth - contentBlockOptions.offsetWidth - 20) + "px";

    sender.parentElement.classList.add("content-block-hover");

    contentBlockOptions.dataset.targetId = sender.parentElement.id;
}

function hideContentBlockOptions() {
    const contentBlockOptions = document.getElementById("content_block_options");
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
        var top = document.getElementById("contextmenu_page").offsetTop;
        if (height - top <= dropdown.offsetHeight)
            dropdown.style.top = (-5 - dropdown.offsetHeight) + "px";
    }
}