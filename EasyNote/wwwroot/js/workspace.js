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
        .then((json) => { document.getElementById("main").innerHTML = json["content"] })
}
