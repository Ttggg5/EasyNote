const login_form = document.getElementById("login-form");
const register_form = document.getElementById("register-form");

const error_texts = document.getElementsByClassName("error-text");

const fun = new URL(location.href).searchParams.get("reg");
if (fun === 'true') {
    login_form.style.animation = "slide-out 0s forwards";
    register_form.style.animation = "slide-in 0s forwards";
}
else {
    login_form.style.animation = "slide-in 0s forwards";
    register_form.style.animation = "slide-out 0s forwards";
}

function showRegisterForm() {
    login_form.style.animation = "slide-out 0.5s forwards";
    register_form.style.animation = "slide-in 1s forwards";
    setAllErrorText("");
}

function showLoginForm() {
    login_form.style.animation = "slide-in 1s forwards";
    register_form.style.animation = "slide-out 0.5s forwards";
    setAllErrorText("");
}

function setAllErrorText(text) {
    Array.from(error_texts).forEach((element) => {
        element.innerHTML = text;
    });
}

function togglePassword(btn, input_id) {
    const passwordInput = document.getElementById(input_id);
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        btn.innerHTML = "<i class='bi bi-eye-slash-fill'></i>";
    } else {
        passwordInput.type = "password";
        btn.innerHTML = "<i class='bi bi-eye-fill'></i>";
    }
}

function validateRegisterForm(form) {
    if (validateEmail(form.account.value))
        return true;
    else
        setAllErrorText("Email format not correct!");
    return false;
}

const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        );
};