const errorText = document.getElementById("error_text");

document.getElementById("send_verification_code_button").addEventListener("click", event => {
    const emailInput = document.getElementById("email");

    if (emailInput.value === "") {
        errorText.innerHTML = "Email is empty!";
        return;
    }
    else if (!String(emailInput.value)
        .toLowerCase()
        .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
    ) {
        errorText.innerHTML = "Email format is not correct!";
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
            if (json["isSuccessed"])
                element.innerHTML = "The code has been sent, please check your email.";
            else
                alert(json["errorMsg"]);
        });
});

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