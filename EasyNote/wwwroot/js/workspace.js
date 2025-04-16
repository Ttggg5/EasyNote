const userId = "";
const noteId = "";

rangy.init();

window.addEventListener("paste", function (e) {
    // cancel paste
    e.preventDefault();

    // get text representation of clipboard
    var text = (e.originalEvent || e).clipboardData.getData('text/plain');

    // insert text manually
    document.execCommand("insertHTML", false, text);
});

document.getElementById("main").addEventListener("mousedown", event => {
    hideContextmenu(document.getElementById("contextmenu_content_block"));
});

document.getElementsByClassName("note-nav")[0].addEventListener("mousedown", event => {
    hideContextmenu(document.getElementById("contextmenu_content_block"));
});

document.getElementsByTagName("header")[0].addEventListener("mousedown", event => {
    hideContextmenu(document.getElementById("contextmenu_content_block"));
});

document.addEventListener("mouseup", event => {
    const selection = window.getSelection();
    if (selection) {
        if ((selection.anchorOffset != selection.focusOffset) || (selection.anchorNode != selection.focusNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            showContextmenu(document.getElementById("contextmenu_page"), rect);
            return;
        }
    }

    hideContextmenu(document.getElementById("contextmenu_page"));
});
    
function deleteContentBlock() {
    const targetId = document.getElementById("contextmenu_content_block").dataset.targetId;
    document.getElementById(targetId).remove();
    sendEditRequest("DeleteContentBlock", "", targetId, "");
    hideContextmenu(document.getElementById("contextmenu_content_block"));
}

function justifyText(pos) {
    const targetId = document.getElementById("contextmenu_content_block").dataset.targetId;
    const content = document.getElementById(targetId).children[1];
    content.style.textAlign = pos;
    hideContextmenu(document.getElementById("contextmenu_content_block"));
}

function setTextSize(size) {
    const targetId = document.getElementById("contextmenu_content_block").dataset.targetId;
    const content = document.getElementById(targetId).children[1];
    content.style.fontSize = size;
    hideContextmenu(document.getElementById("contextmenu_content_block"));
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

function hideContextmenu(target) {
    target.style.display = "none";
    document.getElementById("text_color_dropdown").style.display = "none";
}

function setInfo(userId, noteId) {
    this.userId = userId;
    this.noteId = noteId;
}

function showNote() {
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
            document.getElementById("main").insertAdjacentHTML("beforeend", json["content"]);
            document.getElementById(json["noteId"]).parentElement.style.background = "#656565ff"; // show as selected

            startAutoSave();
        })
}

function startAutoSave() {
    config = {
        attributes: true,
        subtree: true,
        childList: true,
        characterData: true,
    }

    document.getElementById("title").addEventListener("change", (event) => {
        var noteName = document.getElementById("title").value;
        if (noteName == "")
            noteName = "Untitled";

        document.getElementById(this.noteId).innerText = noteName;
        sendEditRequest("Name", noteName, "", "");
    });

    const observer = new MutationObserver((mutationsList, observer) => {
        var targets = {};
        mutationsList.forEach(value => {
            var targetNode = value.target;
            try {
                while (targetNode.parentNode.className != "content-block") {
                    targetNode = targetNode.parentNode;
                }
                targets[targetNode.parentNode.id] = targetNode.outerHTML;
            } catch (error) {
                console.log(error);
            }
        });
        for (const [key, value] of Object.entries(targets)) {
            sendEditRequest("Content", "", key, value);
        }
    });

    observer.observe(document.getElementById("main"), config);
}

function sendEditRequest(editType, noteName, contentBlockId, content) {
    fetch("/Main/EditNote", {
        method: "POST",
        body: JSON.stringify({
            UserId: this.userId,
            NoteId: this.noteId,
            EditType: editType,
            NoteName: noteName,
            ContentBlockId: contentBlockId,
            Content: content,
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            //console.log(json);
        })
}

function newBlock(sneder) {
    const surDate = new Date()
    const id = "CB" + surDate.getTime();

    const contentBlock = document.createElement("div");
    contentBlock.className = "content-block";
    contentBlock.id = id;
    contentBlock.setAttribute("tabindex", "-1");

    const dragBlock = document.createElement("div");
    dragBlock.className = "drag-block";
    dragBlock.innerHTML = "<img draggable=\"false\" src=\"/assets/bars-solid.svg\"/>";

    const content = document.createElement("div");
    content.contentEditable = "true";
    content.className = "content";

    const optionBlock = document.createElement("div");
    optionBlock.className = "option-block";
    optionBlock.innerHTML = "<img draggable=\"false\" src=\"/assets/ellipsis-vertical-solid.svg\"/>";
    optionBlock.setAttribute("onclick", "showOptions(this)");

    contentBlock.appendChild(dragBlock);
    contentBlock.appendChild(content);
    contentBlock.appendChild(optionBlock);

    document.getElementById("note").insertBefore(contentBlock, sneder);

    sendEditRequest("AddContentBlock", "", id, "");
}

function showOptions(sender) {
    const contextmenuContentBlock = document.getElementById("contextmenu_content_block");
    contextmenuContentBlock.style.display = "flex";

    var windowInnerHeight = window.innerHeight;
    var optionBlockOffsets = getOffset(sender);
    if (windowInnerHeight - optionBlockOffsets.height - optionBlockOffsets.top <= contextmenuContentBlock.offsetHeight)
        contextmenuContentBlock.style.top = (optionBlockOffsets.top - contextmenuContentBlock.offsetHeight) + "px";
    else
        contextmenuContentBlock.style.top = (optionBlockOffsets.top + optionBlockOffsets.height) + "px";
    contextmenuContentBlock.style.left = (window.innerWidth - contextmenuContentBlock.offsetWidth - 20) + "px";

    sender.parentElement.focus();

    contextmenuContentBlock.dataset.targetId = sender.parentElement.id;
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