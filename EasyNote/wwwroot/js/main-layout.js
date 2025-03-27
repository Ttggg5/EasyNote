const dropdownCb = document.getElementById("dropdown_cb");
const dropdownIcon = document.getElementById("profile-block-dropdowns-img");
const dropdownItems = document.getElementById("profile-block-dropdown-items");

dropdownItems.style.animation = "dropdown-items-hide 0s forwards";
dropdownItems.style.display = "unset";

function dropdownClicked() {
    if (dropdownCb.checked) {
        dropdownIcon.style.animation = "dropdown-img-rotate 0.3s forwards";
        dropdownItems.style.animation = "dropdown-items-show 0.3s forwards";
    }
    else {
        dropdownIcon.style.animation = "dropdown-img-rotate-reverse 0.3s forwards";
        dropdownItems.style.animation = "dropdown-items-hide 0.3s forwards";
    }
}

function logout() {
    window.location.href = window.location.href.replace("Workspace", "logout");
}

function newNote() {

}