﻿document.addEventListener('contextmenu', event => event.preventDefault());

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
            document.getElementById("main").innerHTML = json["content"];
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

    const observer = new MutationObserver((mutationsList, observer) => {
        fetch("/Main/EditNote", {
            method: "POST",
            body: JSON.stringify({
                UserId: userId,
                NoteId: noteId,
                NoteName: document.getElementById("title").innerText,
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
    });

    observer.observe(document.getElementById("main"), config);

    const titleObserver = new MutationObserver((mutationsList, observer) => {
        document.getElementById(noteId).innerText = document.getElementById("title").innerText;
    });

    titleObserver.observe(document.getElementById("title"), config);
}