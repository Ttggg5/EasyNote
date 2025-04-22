const userId = "";
const noteId = "";

const observers = {}; // "contentBlockId": observer
observerOptions = {
    attributes: true,
    subtree: true,
    childList: true,
    characterData: true,
}

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
    const contextmenuContentBlock = document.getElementById("contextmenu_content_block");
    const targetId = contextmenuContentBlock.dataset.targetId;
    if (targetId == "") return;
    document.getElementById(targetId).classList.remove("content-block-hover");
    hideContentBlockOptions(contextmenuContentBlock);
}

document.addEventListener("mouseup", event => {
    const contextmenuPage = document.getElementById("contextmenu_page");
    const selection = window.getSelection();
    if (selection) {
        if ((selection.anchorOffset != selection.focusOffset) || (selection.anchorNode != selection.focusNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showContextmenu(contextmenuPage, rect);
            return;
        }
    }

    contextmenuPage.style.display = "none";
    document.getElementById("text_color_dropdown").style.display = "none";
});

function getContentBlockChildNode(contentBlockId, className) {
    for (const child of document.getElementById(contentBlockId).children) {
        if (child.classList.contains(className))
            return child;
    }
}

function deleteContentBlock() {
    const targetId = document.getElementById("contextmenu_content_block").dataset.targetId;
    observers[targetId].disconnect();
    delete observers[targetId];
    document.getElementById(targetId).remove();

    sendEditRequest("DeleteContentBlock", {
        contentBlockId: targetId,
    });

    hideContentBlockOptions();
}

function justifyText(pos) {
    const targetId = document.getElementById("contextmenu_content_block").dataset.targetId;
    const content = getContentBlockChildNode(targetId, "content");
    content.style.textAlign = pos;
    hideContentBlockOptions();
}

function setTextSize(size) {
    const targetId = document.getElementById("contextmenu_content_block").dataset.targetId;
    const content = getContentBlockChildNode(targetId, "content");
    content.style.fontSize = size;
    hideContentBlockOptions();
}

function changeSelectedTextStyle(className) {
    var sel = rangy.getSelection();
    if (sel.rangeCount > 0) {
        var allClasses = [];
        if (className.startsWith("text-color-"))
            allClasses = ["text-color-white", "text-color-black", "text-color-yellow", "text-color-red", "text-color-blue", "text-color-green"];
        else if (className.startsWith("highlight-"))
            allClasses = ["highlight-transparent", "highlight-black", "highlight-yellow", "highlight-red", "highlight-blue", "highlight-green"];
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
    hideContextmenu(document.getElementById("contextmenu_page"));
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

    Sortable.create(note, {
        disabled: false, // Sortable
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
    contentBlock.className = "content-block";
    contentBlock.id = id;
    contentBlock.setAttribute("tabindex", "-1");
    contentBlock.dataset.type = type;

    const content = document.createElement("div");
    content.contentEditable = "true";
    content.classList.add("content");

    contentBlock.appendChild(createDragBlock());
    if (type == "image") {
        content.classList.add("content-auto-width");
        const image = document.createElement("img");
        image.src = "/assets/loading_spinner.gif";
        image.width = 300;
        image.classList.add("content-image");
        contentBlock.appendChild(image);
    }
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
    const contextmenuContentBlock = document.getElementById("contextmenu_content_block");
    contextmenuContentBlock.style.display = "flex";

    var windowInnerHeight = window.innerHeight;
    var optionBlockOffsets = getOffset(sender);
    if (windowInnerHeight - optionBlockOffsets.height - optionBlockOffsets.top <= contextmenuContentBlock.offsetHeight)
        contextmenuContentBlock.style.top = (optionBlockOffsets.top - contextmenuContentBlock.offsetHeight) + "px";
    else
        contextmenuContentBlock.style.top = (optionBlockOffsets.top + optionBlockOffsets.height) + "px";
    contextmenuContentBlock.style.left = (window.innerWidth - contextmenuContentBlock.offsetWidth - 20) + "px";

    sender.parentElement.classList.add("content-block-hover");

    contextmenuContentBlock.dataset.targetId = sender.parentElement.id;
}

function hideContentBlockOptions() {
    const contextmenuContentBlock = document.getElementById("contextmenu_content_block");
    contextmenuContentBlock.style.display = "none";
    contextmenuContentBlock.dataset.targetId = "";
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