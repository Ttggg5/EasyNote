const dropdownCb = document.getElementById("dropdown_cb");
const dropdownIcon = document.getElementById("profile-block-dropdowns-img");
const dropdownItems = document.getElementById("profile-block-dropdown-items");

dropdownItems.style.animation = "dropdown-items-hide 0s forwards";
dropdownItems.style.display = "unset";

document.getElementsByClassName("main-body")[0].addEventListener("mousedown", event => {
    if (event.button == 0) { // left button
        hideDropdown();
    }
});

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

function renameNote(userId, noteId, noteName) {
    var result = prompt("Rename", noteName);
    if (result != null) {
        if (result == "") {
            alert("Note name can not be empty!");
            return;
        }

        fetch("/Main/EditNote", {
            method: "POST",
            body: JSON.stringify({
                UserId: userId,
                NoteId: noteId,
                EditType: "Name",
                NoteName: result,
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
                document.getElementById(json["noteId"]).innerHTML = result;

                // apply new name in title input if current page is showing the same note
                var urlParameter = new URL(window.location.href).searchParams.get("noteId");
                if (urlParameter != null && urlParameter == json["noteId"])
                    document.getElementById("title").value = result
            })
    }
}

function deleteNote(noteId, noteName) {
    if (confirm("Are you sure you want to delete \"" + noteName + "\"")) {
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