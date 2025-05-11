function getCalendarEventsInDay(date) {
    return new Promise((resolve, reject) => {
        fetch("/AllEventsInDay", {
            method: "POST",
            body: JSON.stringify(
                date.getFullYear() + "/" + ((date.getMonth() + 1) > 9 ? "" : "0") + (date.getMonth() + 1) + "/" + (date.getDate() > 9 ? "" : "0") + date.getDate()
            ), // format: yyyy/mm/dd
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((jsonList) => {
                resolve(jsonList);
            });
    })
}

function initEventToday() {
    const eventToday = document.getElementById("event_today");

    getCalendarEventsInDay(new Date())
        .then(calendarEventList => {
            if (calendarEventList === null) {
                const span = document.createElement("span");
                span.innerHTML = "No event found";
                eventToday.appendChild(span);
                return;
            }

            for (const calendarEvent of calendarEventList) {
                const eventDiv = document.createElement("div");
                eventDiv.id = calendarEvent.eventId;
                eventDiv.classList.add("event");
                eventDiv.style.opacity = "1000%";
                eventDiv.addEventListener("click", event => {
                    if (eventDiv.classList.contains("open"))
                        eventDiv.classList.remove("open");
                    else
                        eventDiv.classList.add("open");
                });

                const eventTag = document.createElement("div");
                let randNumberR = new Math.seedrandom(calendarEvent.eventId).quick() * 200 + 30;
                let randNumberG = new Math.seedrandom(calendarEvent.eventName).quick() * 200 + 30;
                let randNumberB = new Math.seedrandom(calendarEvent.eventContent).quick() * 200 + 30;
                eventTag.style.background = "rgb(" + randNumberR + "," + randNumberG + "," + randNumberB + ")";
                eventDiv.appendChild(eventTag);

                const titleContentContainer = document.createElement("div");
                const startDate = new Date(calendarEvent.eventStartTime);
                const endDate = new Date(calendarEvent.eventEndTime);

                const eventTtile = document.createElement("div");
                eventTtile.classList.add("event-title");
                eventTtile.innerHTML = "<span>" + calendarEvent.eventName + "</span><span>" + startDate.toLocaleString() + " ~ " + endDate.toLocaleString() + "</span>";
                titleContentContainer.appendChild(eventTtile)

                const eventContent = document.createElement("span");
                eventContent.classList.add("event-content");
                eventContent.innerText = calendarEvent.eventContent;
                titleContentContainer.appendChild(eventContent)

                eventDiv.appendChild(titleContentContainer);

                eventToday.appendChild(eventDiv);
            }
        });
}

initEventToday();