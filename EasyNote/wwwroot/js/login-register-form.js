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

document.getElementById("send_verification_code_button").addEventListener("click", event => {
    const emailInput = document.getElementById("email-register");

    if (emailInput.value === "") {
        Array.from(error_texts).forEach((element) => {
            element.innerHTML = "Email is empty!";
        });
        return;
    }
    else if (!String(emailInput.value)
        .toLowerCase()
        .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
    ) {
        Array.from(error_texts).forEach((element) => {
            element.innerHTML = "Email format is not correct!";
        });
        return;
    }

    document.getElementById("send_verification_code_button").disabled = true;
    var count = 30;
    const timerId = setInterval(() => {
        count--;
        document.getElementById("send_verification_code_button").innerHTML = "Send code(" + count + ")"
        if (count === 0) {
            document.getElementById("send_verification_code_button").innerHTML = "Send code"
            document.getElementById("send_verification_code_button").disabled = false;
            clearInterval(timerId);
        }
    }, 1000);

    fetch("/SendVerificationCode", {
        method: "POST",
        body: JSON.stringify(emailInput.value),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            //console.log(json);
            if (json["isSuccessed"]) {
                Array.from(error_texts).forEach((element) => {
                    element.innerHTML = "The code has been sent, please check your email.";
                });
            }
            else
                alert(json["errorMsg"]);
        });
});

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