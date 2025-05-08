const dropdownCb = document.getElementById("dropdown_cb");
const dropdownIcon = document.getElementById("profile-block-dropdowns-img");
const dropdownItems = document.getElementById("profile-block-dropdown-items");

dropdownItems.style.animation = "dropdown-items-hide 0s forwards";
dropdownItems.style.display = "unset";

document.getElementById("nav_button").addEventListener("click", event => {
    var state = "";
    const noteNav = document.getElementById("note_nav");
    if (noteNav.classList.contains("open")) {
        noteNav.classList.remove("open");
        setTimeout(() => noteNav.style.display = "none", 300);

        state = "hide";
    }
    else {
        noteNav.style.display = "flex";
        setTimeout(() => noteNav.classList.add("open"), 100);

        state = "show";
    }

    fetch("/SetNavState", {
        method: "POST",
        body: JSON.stringify(state),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            
        })
});

document.getElementsByClassName("main-body")[0].addEventListener("mousedown", event => {
    if (event.button == 0) { // left button
        hideDropdown();
    }
});

if (getCookie("NoteNav") === "show") {
    const noteNav = document.getElementById("note_nav");
    noteNav.style.display = "flex";
    noteNav.classList.add("open");
}

function getCookie(name) {
    let cookie = {};
    document.cookie.split(';').forEach(function (el) {
        let split = el.split('=');
        cookie[split[0].trim()] = split.slice(1).join("=");
    })
    return cookie[name];
}

function iconClicked() {
    window.location.href = '/Workspace';
}

function dropdownClicked() {
    if (dropdownCb.checked) showDropdown();
    else hideDropdown();
}

function showDropdown() {
    dropdownIcon.style.animation = "dropdown-img-rotate 0.3s forwards";
    dropdownItems.style.animation = "dropdown-items-show 0.3s forwards";
}

function hideDropdown() {
    dropdownIcon.style.animation = "dropdown-img-rotate-reverse 0.3s forwards";
    dropdownItems.style.animation = "dropdown-items-hide 0.3s forwards";
}

function logout() {
    window.location.href = window.location.href.replace("Workspace", "logout");
}

function newNote(url, id) {
    fetch(url, {
        method: "POST",
        body: JSON.stringify(id),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            if (json["isSuccessed"]) {
                window.location.href = "/Workspace?noteId=" + json["noteId"];
            }
            else
                window.alert(json["errorMsg"]);
        })
}

function renameNote(userId, noteId) {
    const noteLink = document.getElementById(noteId);
    const renameInput = document.createElement("input");

    renameInput.type = "text";
    renameInput.id = "renameInput";
    renameInput.value = noteLink.innerText;

    // show input and hide original link
    noteLink.after(renameInput);
    renameInput.focus();
    noteLink.style.display = "none";

    const renameRequest = () => {
        noteLink.style.display = "block";
        if (renameInput.value !== "" && document.getElementById(noteId).innerText !== renameInput.value) {
            fetch("/Main/EditNote", {
                method: "POST",
                body: JSON.stringify({
                    UserId: userId,
                    NoteId: noteId,
                    EditType: "Name",
                    NoteName: renameInput.value,
                    ContentBlockId: "",
                    Content: "",
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                }
            })
                .then((response) => response.json())
                .then((json) => {
                    // apply new name in note list
                    document.getElementById(json["noteId"]).innerText = renameInput.value;

                    // apply new name in title input if current page is showing the same note
                    var urlParameter = new URL(window.location.href).searchParams.get("noteId");
                    if (urlParameter != null && urlParameter == json["noteId"])
                        document.getElementById("title").value = renameInput.value
                })
        }

        renameInput.remove();
    }

    renameInput.addEventListener("focusout", renameRequest);

    renameInput.addEventListener("keypress", event => {
        if (event.key === "Enter") {
            renameInput.removeEventListener("focusout", renameRequest);
            renameRequest();
        }
    });
}

function deleteNote(noteId) {
    const noteLink = document.getElementById(noteId);
    if (confirm("Are you sure you want to delete \"" + noteLink.innerText + "\"")) {
        fetch("/DeleteNote", {
            method: "POST",
            body: JSON.stringify(noteId),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((json) => {
                if (json["isSuccessed"]) {
                    var urlParameter = new URL(window.location.href).searchParams.get("noteId");
                    if (urlParameter != null && urlParameter == json["noteId"])
                        window.location.href = "/Workspace";
                    else
                        document.getElementById(json["noteId"]).parentElement.remove();
                }
                else
                    window.alert(json["errorMsg"]);
            })
    }
}