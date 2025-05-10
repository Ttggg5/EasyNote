const imageUploadDialog = document.getElementById("image_upload_dialog");
const loadingSpinnerDialog = document.getElementById("loading_spinner_dialog");
const nameEditDialog = document.getElementById("name_edit_dialog");
const imagePreview = document.getElementById('image_preview');
const croppedImage = document.getElementById('cropped_image');
var cropper;

function init() {
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
            }
        })

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
                        viewMode: 3,
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

    document.getElementById("name_edit_button").addEventListener("click", event => {
        nameEditDialog.showModal();
        document.getElementById("name_input").value = document.getElementById("name").innerText;
    });

    document.getElementById("name_edit_cancel_button").addEventListener("click", event => {
        nameEditDialog.close();
    });

    document.getElementById("name_edit_confirm_button").addEventListener("click", event => {
        if (document.getElementById("name_input").value === "") {
            alert("Name cannot be empty!");
            return;
        }

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
            })
    });
}

init();