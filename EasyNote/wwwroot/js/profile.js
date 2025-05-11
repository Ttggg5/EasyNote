const imageUploadDialog = document.getElementById("image_upload_dialog");
const loadingSpinnerDialog = document.getElementById("loading_spinner_dialog");
const nameEditDialog = document.getElementById("name_edit_dialog");
const emailEditDialog = document.getElementById("email_edit_dialog");
const passwordEditDialog = document.getElementById("password_edit_dialog");

function init() {
    // show all user info
    fetch("/GetUser", {
        method: "POST",
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            //console.log(json);
            if (json["isSuccessed"]) {
                document.getElementById("name_big").innerHTML = json["name"];
                document.getElementById("name").innerHTML = json["name"];
                document.getElementById("email").innerHTML = json["email"];
                document.getElementById("create_date").innerHTML = new Date(json["createDate"]).toUTCString();

                if (json["registType"] === "EasyNote") {
                    const passwordEditButton = document.createElement("button");
                    passwordEditButton.id = "password_edit_button";
                    passwordEditButton.classList.add("edit-button");
                    passwordEditButton.title = "Edit";
                    passwordEditButton.innerHTML = "<i class=\"bi bi-pencil-fill\"></i>";
                    document.getElementById("password").after(passwordEditButton);

                    const emailEditButton = document.createElement("button");
                    emailEditButton.id = "email_edit_button";
                    emailEditButton.classList.add("edit-button");
                    emailEditButton.title = "Edit";
                    emailEditButton.innerHTML = "<i class=\"bi bi-pencil-fill\"></i>";
                    document.getElementById("email").after(emailEditButton);

                    initEmail();
                    initPasswordEdit();
                }
                else if (json["registType"] === "Google") {
                    document.getElementById("email").innerHTML = "<i class=\"bi bi-google\"></i> Login";
                    document.getElementById("password").innerHTML = "<i class=\"bi bi-google\"></i> Login";
                }
            }
        })

    initImageEdit();
    initNameEdit();
}

function initImageEdit() {
    const imagePreview = document.getElementById('image_preview');
    const croppedImage = document.getElementById('cropped_image');
    var cropper;

    document.getElementById("image_edit_button").addEventListener("click", event => {
        const input = document.createElement("input");
        input.type = "file";
        input.addEventListener('change', (event) => {
            const files = event.target.files;
            if (files && files.length > 0) {
                const reader = new FileReader();
                reader.onload = () => {
                    imagePreview.src = reader.result;
                    if (cropper)
                        cropper.destroy();

                    cropper = new Cropper(imagePreview, {
                        aspectRatio: 1,
                        viewMode: 1,
                    });
                };
                reader.readAsDataURL(files[0]);

                imageUploadDialog.showModal();
            }
        });
        input.click();
    });

    document.getElementById("crop_cancel_button").addEventListener("click", event => {
        imageUploadDialog.close();
    });

    imageUploadDialog.addEventListener("submit", event => {
        if (cropper) {
            loadingSpinnerDialog.showModal();

            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300,
            });

            canvas.toBlob((blob) => {
                const formData = new FormData();
                formData.append('file', blob, 'cropped.png');

                fetch("/UploadProfileImage", {
                    method: "POST",
                    body: formData,
                })
                    .then((response) => response.json())
                    .then((json) => {
                        //console.log(json);
                        loadingSpinnerDialog.close();
                        if (json["isSuccessed"])
                            location.reload();
                        else
                            alert(json["errorMsg"]);
                    })
            }, 'image/png');
        }
    });
}

function initNameEdit() {
    document.getElementById("name_edit_button").addEventListener("click", event => {
        nameEditDialog.showModal();
        document.getElementById("name_input").value = document.getElementById("name").innerText;
    });

    document.getElementById("name_edit_cancel_button").addEventListener("click", event => {
        nameEditDialog.close();
    });

    nameEditDialog.addEventListener("submit", event => {
        nameEditDialog.close();

        fetch("/SetUserName", {
            method: "POST",
            body: JSON.stringify(document.getElementById("name_input").value),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((json) => {
                //console.log(json);
                if (json["isSuccessed"])
                    location.reload();
                else
                    alert(json["errorMsg"]);
            });
    });
}

function initPasswordEdit() {
    const oldPasswordInput = document.getElementById("old_password_input");
    const newPasswordInput = document.getElementById("new_password_input");
    const newPasswordConfirmInput = document.getElementById("new_password_confirm_input");
    const passwordErrorMsg = document.getElementById("password_error_msg");

    document.getElementById("password_edit_button").addEventListener("click", event => {
        oldPasswordInput.value = "";
        newPasswordInput.value = "";
        newPasswordConfirmInput.value = "";
        passwordErrorMsg.innerHTML = "";

        passwordEditDialog.showModal();
    });


    document.getElementById("password_edit_cancel_button").addEventListener("click", event => {
        passwordEditDialog.close();
    });
    
    passwordEditDialog.addEventListener("submit", event => {
        event.preventDefault();
        const formData = new FormData(event.target);
        fetch("/VerifyPassword", {
            method: "POST",
            body: JSON.stringify(formData.get("oldPassword")),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((json) => {
                if (json["isVerified"]) {
                    if (formData.get("newPassword") === formData.get("confirmPassword")) {
                        fetch("/ChangePassword", {
                            method: "POST",
                            body: JSON.stringify({
                                oldPassword: formData.get("oldPassword"),
                                newPassword: formData.get("newPassword"),
                            }),
                            headers: {
                                "Content-type": "application/json; charset=UTF-8"
                            }
                        })
                            .then((response) => response.json())
                            .then((json) => {
                                if (json["isSuccessed"])
                                    alert("Password changed!");
                                else
                                    alert(json["errorMsg"]);
                                passwordEditDialog.close();
                            });
                    }
                    else {
                        passwordErrorMsg.innerHTML = "Confirm new password is not same!";
                        newPasswordConfirmInput.value = "";
                        newPasswordInput.value = "";
                    }
                }
                else {
                    passwordErrorMsg.innerHTML = "Old password is not correct!";
                    oldPasswordInput.value = "";
                    newPasswordInput.value = "";
                    newPasswordConfirmInput.value = "";
                }
            })
    });
}

function initEmail() {
    const emailInput = document.getElementById("email_input");
    const emailErrorMsg = document.getElementById("email_error_msg");

    document.getElementById("email_edit_button").addEventListener("click", event => {
        emailInput.value = "";
        emailErrorMsg.innerHTML = "";

        emailEditDialog.showModal();
    });

    document.getElementById("send_verification_code_button").addEventListener("click", event => {
        if (emailInput.value === "") {
            emailErrorMsg.innerHTML = "Email is empty!";
            return;
        }
        else if (!String(emailInput.value)
            .toLowerCase()
            .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)
        ) {
            emailErrorMsg.innerHTML = "Email format is not correct!";
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
                    emailErrorMsg.innerHTML = "The code has been sent, please check your email."
                }
                else
                    alert(json["errorMsg"]);
            });
    });

    document.getElementById("email_edit_cancel_button").addEventListener("click", event => {
        emailEditDialog.close();
    });

    emailEditDialog.addEventListener("submit", event => {
        event.preventDefault();
        const formData = new FormData(event.target);

        fetch("/ChangeEmail", {
            method: "POST",
            body: JSON.stringify({
                Email: formData.get("email"),
                VerificationCode: formData.get("verificationCode"),
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((json) => {
                if (json["isSuccessed"])
                    location.reload();
                else
                    emailErrorMsg.innerHTML = json["errorMsg"];
            });
    });
}

init();