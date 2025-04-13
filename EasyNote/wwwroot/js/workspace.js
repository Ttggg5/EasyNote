﻿const userId = "";
const noteId = "";

rangy.init();

document.addEventListener('contextmenu', event => {
    event.preventDefault();
});

document.getElementById("main").addEventListener("mousedown", event => {
    if (event.button == 0) { // left button
        hideContextmenu(document.getElementById("contextmenu_page"));
        hideContextmenu(document.getElementById("contextmenu_content_block"));
    }
    else if (event.button == 2) { // right button
        hideContextmenu(document.getElementById("contextmenu_page"));
        showContextmenu(document.getElementById("contextmenu_page"), event);
    }
});

document.getElementById("delete_line").addEventListener("click", event => {
    const targetId = document.getElementById("contextmenu_content_block").dataset.targetId;
    document.getElementById(targetId).remove();
    sendEditRequest("DeleteContentBlock", "", targetId, "");
    hideContextmenu(document.getElementById("contextmenu_content_block"));
});

function changeSelectedTextStyle(className) {
    var sel = rangy.getSelection();
    if (sel.rangeCount > 0) {
        var allClasses = [];
        if (className.startsWith("text-color-"))
            allClasses = ["text-color-yellow", "text-color-red", "text-color-blue", "text-color-green"];
        else if (className.startsWith("highlight-"))
            allClasses = ["highlight-yellow", "highlight-red", "highlight-blue", "highlight-green"];
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

function showContextmenu(target, event) {
    target.style.display = "flex";

    var x = event.clientX, y = event.clientY;
    if (window.innerWidth - event.clientX < target.offsetWidth + 10)
        x = window.innerWidth - target.offsetWidth - 10;
    if (window.innerHeight - event.clientY < target.offsetHeight + 10)
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
        var targetNode = mutationsList[0].target;
        try {
            while (targetNode.parentNode.className != "content-block") {
                targetNode = targetNode.parentNode;
            }
        } catch(error) {
            return;
        }
        sendEditRequest("Content", "", targetNode.parentNode.id, targetNode.innerHTML);
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
    contextmenuContentBlock.style.top = (getOffset(sender).top + sender.offsetHeight) + "px"
    contextmenuContentBlock.style.left = (window.innerWidth - contextmenuContentBlock.offsetWidth - 20) + "px";

    sender.parentElement.focus();

    contextmenuContentBlock.dataset.targetId = sender.parentElement.id;
}

function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
}

function toggleDropdownDisplay() {
    var dropdown = document.getElementById("text_color_dropdown");
    if (dropdown.style.display == "block")
        dropdown.style.display = "none";
    else {
        dropdown.style.display = "block";
        dropdown.style.top = "60px";

        var height = document.getElementById("main").offsetHeight;
        var top = document.getElementById("contextmenu_page").offsetTop;
        if (height - top <= dropdown.offsetHeight)
            dropdown.style.top = (-5 - dropdown.offsetHeight) + "px";
    }
}