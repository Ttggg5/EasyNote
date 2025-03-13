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

function show_register_form() {
    login_form.style.animation = "slide-out 0.5s forwards";
    register_form.style.animation = "slide-in 0.5s forwards";
    clear_all_error_text();
}

function show_login_form() {
    login_form.style.animation = "slide-in 0.5s forwards";
    register_form.style.animation = "slide-out 0.5s forwards";
    clear_all_error_text();
}

function clear_all_error_text() {
    Array.from(error_texts).forEach((element) => {
        element.innerHTML = "";
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