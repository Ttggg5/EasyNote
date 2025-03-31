document.addEventListener('contextmenu', event => event.preventDefault());

document.getElementById("main").addEventListener("mousedown", event => {
    if (event.button == 0) // left button
        hideContextmenu();
    else if (event.button == 2) // right button
        showContextmenu();
});

var previousContent = "";

function showContextmenu() {
    const contextmenu = document.getElementById("contextmenu");
    contextmenu.style.display = "flex";

    var x = event.clientX, y = event.clientY;
    if (window.innerWidth - event.clientX < contextmenu.offsetWidth)
        x = window.innerWidth - contextmenu.offsetWidth;
    if (window.innerHeight - event.clientY < contextmenu.offsetHeight)
        y = window.innerHeight - contextmenu.offsetHeight;

    contextmenu.style.left = x + "px";
    contextmenu.style.top = y + "px";
}

function hideContextmenu() {
    const contextmenu = document.getElementById("contextmenu");
    contextmenu.style.display = "none";
}

function showNote(userId, noteId) {
    if (userId == "" || noteId == "")
        return;

    fetch("/Main/GetNote", {
        method: "POST",
        body: JSON.stringify(noteId),
        headers: {
            "Content-type": "application/json"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            document.getElementById("title").value = json["noteName"];
            document.getElementById("main").innerHTML = json["content"];
            document.getElementById(json["noteId"]).style.background = "#656565ff"; // show as selected
            startAutoSave(userId, noteId);
        })
}

function startAutoSave(userId, noteId) {
    config = {
        attributes: true,
        subtree: true,
        childList: true,
        characterData: true,
    }

    document.getElementById("title").addEventListener("change", (event) => {
        document.getElementById(noteId).innerText = document.getElementById("title").value;
        sendEditRequest(userId, noteId);
    });

    const observer = new MutationObserver((mutationsList, observer) => {
        sendEditRequest(userId, noteId);
    });

    observer.observe(document.getElementById("main"), config);
}

function sendEditRequest(userId, noteId) {
    fetch("/Main/EditNote", {
        method: "POST",
        body: JSON.stringify({
            UserId: userId,
            NoteId: noteId,
            NoteName: document.getElementById("title").value,
            Content: document.getElementById("main").innerHTML,
        }),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            console.log(json);
        })
}

function newBlock(sneder) {
    const newNode = document.createElement("div");
    newNode.contentEditable = "true";
    newNode.className = "content-block";
    document.getElementById("main").insertBefore(newNode, sneder);
}