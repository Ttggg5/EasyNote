const userId = "";
const noteId = "";

const allTextColorClasses = ["text-color-white", "text-color-black", "text-color-yellow", "text-color-red", "text-color-blue", "text-color-green", "text-color-darkgreen", "text-color-darkblue", "text-color-darkred"];
const allHighlightColorClasses = ["highlight-transparent", "highlight-black", "highlight-yellow", "highlight-red", "highlight-blue", "highlight-green", "highlight-darkgreen", "highlight-darkblue", "highlight-darkred"];

const contentTextTypes = {
    None: "None",
    Text: "Text",
    Heading1: "Heading1",
    Heading2: "Heading2",
    Heading3: "Heading3",
    BulletList: "BulletList",
}

const contentObjectTypes = {
    None: "None",
    Image: "Image",
    Youtube: "Youtube",
}

const insertContentButtonTypes = {
    Text: "Text",
    Heading1: "Heading1",
    Heading2: "Heading2",
    Heading3: "Heading3",
    BulletList: "BulletList",
    Image: "Image",
    Youtube: "Youtube",
}

const noteEditTypes = {
    Name: "Name",
    ContentAttribute: "ContentAttribute",
    ContentText: "ContentText",
    ContentObject: "ContentObject",
    AddContentBlock: "AddContentBlock",
    DeleteContentBlock: "DeleteContentBlock",
    ContentBlockOrder: "ContentBlockOrder",
}

const contentTextObservers = {}; // "contentBlockId": observer
observerOptions = {
    attributes: true,
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: ["class", "style"],
}

const youtubeUrlDialog = document.getElementById("youtube_url_dialog");
const note = document.getElementById("note");
const contextmenu = document.getElementById("contextmenu");
const contentBlockOptions = document.getElementById("content_block_options");
const contentImageResizer = document.getElementById("content_image_resizer");

var contentChangedBlockIds = {};
var counter = 0;
var editing = false;
var sendContentTextRequestTimerId = -1;

var previousMouseX = -1;

// send request when user is not editing if user is editing wait at most 500ms
async function sendContentTextRequestTimerHandler() {
    if (editing && counter < 5) {
        editing = false;
        counter++;
        return;
    }

    for (const [key, value] of Object.entries(contentChangedBlockIds)) {
        await sendEditRequest(noteEditTypes.ContentText, {
            contentBlockId: key,
            content: value,
        });
    }

    contentChangedBlockIds = {};
    editing = false;
    counter = 0;
}

function unFocusContentBlock() {
    const targetId = contentBlockOptions.dataset.targetId;
    if (targetId == "") return;
    getContentBlockWrapperChild(targetId, "content-block").classList.remove("content-block-hover");
    hideContentBlockOptions(contentBlockOptions);
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
    contentTextObservers[targetId].disconnect();
    delete contentTextObservers[targetId];

    hideContentBlockOptions();
    document.getElementById(targetId).remove();

    sendEditRequest("DeleteContentBlock", {
        contentBlockId: targetId,
    });
}

function justifyContent(pos) {
    const targetId = contentBlockOptions.dataset.targetId;
    const contentText = getContentBlockWrapperChild(targetId, "content-text");
    if (contentText != null)
        contentText.style.textAlign = pos;

    const contentObject = getContentBlockWrapperChild(targetId, "content-block");
    if (contentObject != null) {
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

        sendEditRequest(noteEditTypes.ContentAttribute, {
            contentBlockId: targetId,
            content: "style=\"flex-direction: " + content.style.flexDirection + "; align-items: " + pos + "\"",
        });
    }

    hideContentBlockOptions();
}

async function changeContentTexttType(type) {
    const targetId = contentBlockOptions.dataset.targetId;
    const contentText = getContentBlockWrapperChild(targetId, "content-text");

    if (contentText.dataset.textType != type) {
        // get pure content html with type
        var contentTextHtml = "";
        if (contentText.dataset.textType === contentTextTypes.BulletList) {
            for (const child of contentText.children[0].children) {
                contentTextHtml += child.innerHTML;
            }
        }
        else
            contentTextHtml = contentText.innerHTML;

        // append type to pure content html
        switch (type) {
            case contentTextTypes.Heading1:
                contentText.style.fontSize = "2em";
                contentText.innerHTML = contentTextHtml;
                break;

            case contentTextTypes.Heading2:
                contentText.style.fontSize = "1.5em";
                contentText.innerHTML = contentTextHtml;
                break;

            case contentTextTypes.Heading3:
                contentText.style.fontSize = "1.17em";
                contentText.innerHTML = contentTextHtml;
                break;

            case contentTextTypes.Text:
                contentText.style.fontSize = "16px";
                contentText.innerHTML = contentTextHtml;
                break;

            case contentTextTypes.BulletList:
                contentText.style.fontSize = "16px";
                contentText.innerHTML = "<ul><li>" + contentTextHtml + "</li></ul>";
                break;
        }
        contentText.dataset.textType = type;
    }
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

    document.getElementById("main").addEventListener("mousedown", event => {
        var tmp = event.target;
        while (tmp != null) {
            if (tmp == contentBlockOptions)
                return;
            tmp = tmp.parentElement;
        }

        unFocusContentBlock();
    });
    document.getElementById("main").addEventListener("scroll", event => {
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

        if (contentBlockOptions.style.display != "none" && contentBlockOptions.dataset.targetId != "")
            showContentBlockOptions(getContentBlockWrapperChild(contentBlockOptions.dataset.targetId, "option-block"));
        else
            hideContentBlockOptions();
    });
    document.getElementById("note_nav").addEventListener("mousedown", event => unFocusContentBlock());
    document.getElementsByTagName("header")[0].addEventListener("mousedown", event => unFocusContentBlock());
    document.addEventListener("mouseup", event => {
        // small delay for selection to disappear
        setTimeout(() => {
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
        }, 100);
    });

    document.getElementById("to_pdf_button").addEventListener("click", event => {
        
    });

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

        // stop contentText observer
        contentTextObservers[contentImageResizer.dataset.targetId].disconnect();
        getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-text").style.width = "auto";

        for (const contentObject of document.getElementsByClassName("content-object")) {
            if (contentObject.dataset.objectType == contentObjectTypes.Image)
                contentObject.children[0].removeEventListener("mouseenter", contentImageMouseenterCallback);
        }

        window.addEventListener("mousemove", windowMousemoveCallback);
        window.addEventListener("mouseup", windowMouseupCallback);
    });

    // init image type content-object behavior
    for (const contentObject of document.getElementsByClassName("content-object")) {
        if (contentObject.dataset.objectType == contentObjectTypes.Image)
            initContentImage(contentObject.children[0]);
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
                const contentBlockWrapperNew = await insertNewContentBlockWrapper(contentObjectTypes.Image, contentTextTypes.Text, getContentBlockIndex(contentBlockWrapper.id));
                uploadFile(file, contentBlockWrapperNew.id)
                    .then(json => {
                        getContentBlockWrapperChild(contentBlockWrapperNew.id, "content-object").children[0].src = json["filePath"];
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

    const imageOffsets = getOffset(getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-object").children[0]);
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
    const targetImage = getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-object").children[0];

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

    // start contentText observer
    const contentText = getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-text");
    contentText.style.width = "100%";
    contentTextObservers[contentImageResizer.dataset.targetId].observe(contentText, observerOptions);

    sendEditRequest(noteEditTypes.ContentObject, {
        contentBlockId: contentImageResizer.dataset.targetId,
        content: getContentBlockWrapperChild(contentImageResizer.dataset.targetId, "content-object").innerHTML,
    });

    for (const contentObject of document.getElementsByClassName("content-object")) {
        if (contentObject.dataset.objectType == contentObjectTypes.Image)
            contentObject.children[0].addEventListener("mouseenter", contentImageMouseenterCallback);
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
        
        // add observer to contentText
        const observer = new MutationObserver(observerCallback);
        observer.observe(getContentBlockWrapperChild(child.id, "content-text"), observerOptions);
        contentTextObservers[child.id] = observer;
    }

    sendContentTextRequestTimerId = setInterval(sendContentTextRequestTimerHandler, 100);
}

async function observerCallback(mutationsList, observer) {
    mutationsList.forEach(value => {
        try {
            const target = getContentBlockWrapper(value.target);
            contentChangedBlockIds[target.id] = getContentBlockWrapperChild(target.id, "content-text").outerHTML;
            editing = true;
        } catch (error) {
            console.log(error);
        }
    });
}

function sendEditRequest(editType, { noteName = "", contentBlockId = "", contentObjectType = "", contentTextType = "", content = "", contentBlockOldIndex = -1, contentBlockNewIndex = -1 }) {
    return new Promise((resolve, reject) => {
        fetch("/Main/EditNote", {
            method: "POST",
            body: JSON.stringify({
                UserId: this.userId,
                NoteId: this.noteId,
                EditType: editType,
                NoteName: noteName,
                ContentBlockId: contentBlockId,
                ContentObjectType: contentObjectType,
                ContentTextType: contentTextType,
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

async function newContentBlockWrapper(contentObjectType, contentTextType) {
    const surDate = new Date()
    const id = "CB" + surDate.getTime();

    const contentBlock = document.createElement("div");
    contentBlock.classList.add("content-block");
    contentBlock.setAttribute("tabindex", "-1");

    const content = document.createElement("div");
    content.classList.add("content");

    const contentObject = document.createElement("div");
    contentObject.classList.add("content-object");
    contentObject.setAttribute("data-object-type", contentObjectType);
    content.appendChild(contentObject);

    const contentText = document.createElement("div");
    contentText.contentEditable = "true";
    contentText.classList.add("content-text");
    contentText.setAttribute("data-text-type", contentTextType);
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

    switch (contentObjectType) {
        case contentObjectTypes.None:
            contentObject.remove();
            break;

        case contentObjectTypes.Image:
            const image = document.createElement("img");
            image.src = "/assets/loading-spinner.gif";
            image.width = 300;
            image.setAttribute("draggable", "false");
            contentObject.appendChild(image);

            initContentImage(image);
            break;

        case contentObjectTypes.Youtube:
            const youtubeFrame = document.createElement("iframe");
            youtubeFrame.classList.add("yooutube_embed");
            youtubeFrame.width = "500";
            youtubeFrame.height = "300";
            youtubeFrame.setAttribute("allowfullscreen", "");
            youtubeFrame.setAttribute("picture-in-picture", "");
            contentObject.appendChild(youtubeFrame);
            break;
    }

    switch (contentTextType) {
        case contentTextTypes.None:
            contentText.remove();
            break;

        case contentTextTypes.Heading1:
            contentText.style.fontSize = "2em";
            break;

        case contentTextTypes.Heading2:
            contentText.style.fontSize = "1.5em";
            break;

        case contentTextTypes.Heading3:
            contentText.style.fontSize = "1.17em";
            break;

        case contentTextTypes.Text:
            contentText.style.fontSize = "16px";
            break;

        case contentTextTypes.BulletList:
            const ul = document.createElement("ul");
            const li = document.createElement("li");
            ul.appendChild(li);
            contentText.appendChild(ul);
            break;
    }

    const responseJson = await sendEditRequest("AddContentBlock", {
        contentBlockId: id,
        contentObjectType: contentObjectType,
        contentTextType: contentTextType,
    });

    if (!responseJson["isSuccessed"])
        return null;

    note.appendChild(contentBlockWrapper);

    // add observer to contentText
    const observer = new MutationObserver(observerCallback);
    observer.observe(contentText, observerOptions);
    contentTextObservers[id] = observer;

    return contentBlockWrapper;
}

async function insertNewContentBlockWrapper(contentObjectType, contentTextType, index) {
    const contentBlockWrapperNew = await newContentBlockWrapper(contentObjectType, contentTextType)
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

    if (contentObjectType != contentObjectTypes.Image) {
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
    contentBlockInsertDropdownItems.addEventListener("wheel", event => {
        event.preventDefault();
        contentBlockInsertDropdownItems.scrollBy({
            left: event.deltaY == 0 ? event.deltaX : event.deltaY,
            behavior: 'smooth',
        })
    });

    // create new heading1 contentBlock button
    const newContentBlockHeading1Button = createNewContentBlockButton(insertContentButtonTypes.Heading1, "Heading 1", "bi bi-type-h1")
    contentBlockInsertDropdownItems.appendChild(newContentBlockHeading1Button);

    // create new heading2 contentBlock button
    const newContentBlockHeading2Button = createNewContentBlockButton(insertContentButtonTypes.Heading2, "Heading 2", "bi bi-type-h2")
    contentBlockInsertDropdownItems.appendChild(newContentBlockHeading2Button);

    // create new heading3 contentBlock button
    const newContentBlockHeading3Button = createNewContentBlockButton(insertContentButtonTypes.Heading3, "Heading 3", "bi bi-type-h3")
    contentBlockInsertDropdownItems.appendChild(newContentBlockHeading3Button);

    // create new text contentBlock button
    const newContentBlockTextButton = createNewContentBlockButton(insertContentButtonTypes.Text, "Text", "bi bi-fonts")
    contentBlockInsertDropdownItems.appendChild(newContentBlockTextButton);

    // create new bullet list contentBlock button
    const newContentBlockBulletListButton = createNewContentBlockButton(insertContentButtonTypes.BulletList, "Bullet list", "bi bi-list-ul")
    contentBlockInsertDropdownItems.appendChild(newContentBlockBulletListButton);

    // create new image contentBlock button
    const newContentBlockImageButton = createNewContentBlockButton(insertContentButtonTypes.Image, "Image", "bi bi-image")
    contentBlockInsertDropdownItems.appendChild(newContentBlockImageButton);

    // create new youtube contentBlock button
    const newContentBlockYoutubeButton = createNewContentBlockButton(insertContentButtonTypes.Youtube, "Youtube", "bi bi-youtube")
    contentBlockInsertDropdownItems.appendChild(newContentBlockYoutubeButton);

    contentBlockInsertDropdown.appendChild(contentBlockInsertDropdownItems);

    return contentBlockInsertDropdown;
}

function createNewContentBlockButton(insertContentButtonType, innerText, iconClassName) {
    const button = document.createElement("button");
    var callback;
    switch (insertContentButtonType) {
        case insertContentButtonTypes.Heading1:
            callback = event => {
                const contentBlockWrapper = getContentBlockWrapper(button);
                const index = contentBlockWrapper ? getContentBlockIndex(contentBlockWrapper.id) : 1; // index 0 is an empty block
                insertNewContentBlockWrapper(contentObjectTypes.None, contentTextTypes.Heading1, index);
            };
            break;

        case insertContentButtonTypes.Heading2:
            callback = event => {
                const contentBlockWrapper = getContentBlockWrapper(button);
                const index = contentBlockWrapper ? getContentBlockIndex(contentBlockWrapper.id) : 1; // index 0 is an empty block
                insertNewContentBlockWrapper(contentObjectTypes.None, contentTextTypes.Heading2, index);
            };
            break;

        case insertContentButtonTypes.Heading3:
            callback = event => {
                const contentBlockWrapper = getContentBlockWrapper(button);
                const index = contentBlockWrapper ? getContentBlockIndex(contentBlockWrapper.id) : 1; // index 0 is an empty block
                insertNewContentBlockWrapper(contentObjectTypes.None, contentTextTypes.Heading3, index);
            };
            break;

        case insertContentButtonTypes.Text:
            callback = event => {
                const contentBlockWrapper = getContentBlockWrapper(button);
                const index = contentBlockWrapper ? getContentBlockIndex(contentBlockWrapper.id) : 1; // index 0 is an empty block
                insertNewContentBlockWrapper(contentObjectTypes.None, contentTextTypes.Text, index);
            };
            break;

        case insertContentButtonTypes.BulletList:
            callback = event => {
                const contentBlockWrapper = getContentBlockWrapper(button);
                const index = contentBlockWrapper ? getContentBlockIndex(contentBlockWrapper.id) : 1; // index 0 is an empty block
                insertNewContentBlockWrapper(contentObjectTypes.None, contentTextTypes.BulletList, index);
            }
            break;

        case insertContentButtonTypes.Image:
            callback = event => {
                const input = document.createElement("input");
                input.type = "file";
                input.setAttribute("multiple", "");
                input.setAttribute("accept", "image/*");
                input.addEventListener("change", async event => {
                    const contentBlockWrapper = getContentBlockWrapper(button);
                    var startIndex = contentBlockWrapper ? getContentBlockIndex(contentBlockWrapper.id) : 1; // index 0 is an empty block
                    const contentBlockWrappersNew = [];
                    const files = event.target.files;
                    for (var i = 0; i < files.length; i++) {
                        contentBlockWrappersNew.push(await insertNewContentBlockWrapper(contentObjectTypes.Image, contentTextTypes.Text, startIndex++));
                    }

                    for (var i = 0; i < files.length; i++) {
                        if (contentBlockWrappersNew[i] != null) {
                            try {
                                const responJson = await uploadFile(files[i], contentBlockWrappersNew[i].id);
                                getContentBlockWrapperChild(contentBlockWrappersNew[i].id, "content-object").children[0].src = responJson["filePath"];
                            } catch (exception) {
                                alert("File upload failed: " + exception["errorMsg"]);
                            }
                        }
                    }
                });
                input.click();
            };
            break;

        case insertContentButtonTypes.Youtube:
            callback = event => {
                document.getElementById("youtube_url").value = "";
                youtubeUrlDialog.showModal();
                youtubeUrlDialog.onsubmit = async event => {
                    const contentBlockWrapper = getContentBlockWrapper(button);
                    const index = contentBlockWrapper ? getContentBlockIndex(contentBlockWrapper.id) : 1; // index 0 is an empty block
                    const contentBlockWrapperNew = await insertNewContentBlockWrapper(contentObjectTypes.Youtube, contentTextTypes.Text, index);
                    
                    const contentObject = getContentBlockWrapperChild(contentBlockWrapperNew.id, "content-object");
                    contentObject.children[0].src = "https://www.youtube.com/embed/" + document.getElementById("youtube_url").value.split("=")[1];

                    await sendEditRequest(noteEditTypes.ContentObject, {
                        contentBlockId: contentBlockWrapperNew.id,
                        content: contentObject.innerHTML,
                    });
                };
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
        getContentBlockWrapperChild(contentBlockOptions.dataset.targetId, "content-block").classList.remove("content-block-hover");
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