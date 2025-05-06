const scrollSelector = new ScrollSelector();
const today = new Date();
const allmonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const allYears = [];
for (let i = today.getFullYear() - 80; i <= today.getFullYear() + 20; i++) {
    allYears.push(i);
}
const weekNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

const scrollSelectorDialog = document.getElementById("scroll_selector_dialog");
scrollSelectorDialog.addEventListener("click", event => {
    if (event.target === scrollSelectorDialog) {
        scrollSelectorDialog.classList.add("close");

        monthDiv.innerText = allmonths[curSelectedMonth];
        yearDiv.innerText = curSelectedYear.toString();
        refreshCalendar();
    }
});
scrollSelectorDialog.addEventListener("animationend", event => {
    if (scrollSelectorDialog.classList.contains("close")) {
        scrollSelectorDialog.classList.remove("close");
        scrollSelectorDialog.close();
        scrollSelectorDialog.removeChild(scrollSelectorDialog.children[0]);
    }
});

const dayBlockDialog = document.getElementById("day_block_dialog");
dayBlockDialog.addEventListener("click", event => {
    if (event.target === dayBlockDialog) {
        document.getElementById("day_block_dialog_date").classList.remove("show");

        const transitionendCallback = event => {
            dayBlockDialog.close();
            dayBlockDialog.dataset.targetId = "";
            dayBlockDialog.removeEventListener("transitionend", transitionendCallback);
        };
        dayBlockDialog.addEventListener("transitionend", transitionendCallback);

        // move dayBlockDialog back to dayBlock
        const dayBlockRect = document.getElementById(dayBlockDialog.dataset.targetId).getBoundingClientRect();

        dayBlockDialog.style.transform = "scale(" + (dayBlockRect.width / dayBlockDialog.offsetWidth * 100.0) + "%, " + (dayBlockRect.height / dayBlockDialog.offsetHeight * 100.0) + "%)";
        dayBlockDialog.style.left = dayBlockRect.x + "px";
        dayBlockDialog.style.top = dayBlockRect.y + "px";
        dayBlockDialog.style.opacity = "0";
    }
});

const newEditEventDialog = document.getElementById("new_edit_event_dialog");
newEditEventDialog.addEventListener("submit", event => {
    const formData = new FormData(event.target);

    if (event.submitter.dataset.submitType === "new") {
        fetch("/NewEvent", {
            method: "POST",
            body: JSON.stringify({
                EventName: formData.get("title"),
                EventContent: formData.get("content"),
                EventStartTime: formData.get("start_date"),
                EventEndTime: formData.get("end_date"),
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((json) => {
                refreshDayBlockDialogEventContainer(new Date(Number(dayBlockDialog.dataset.targetId)));
                refreshCalendar();
            });
    }
    else {
        fetch("/EditEvent", {
            method: "POST",
            body: JSON.stringify({
                EventId: newEditEventDialog.dataset.targetId,
                EventName: formData.get("title"),
                EventContent: formData.get("content"),
                EventStartTime: formData.get("start_date"),
                EventEndTime: formData.get("end_date"),
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        })
            .then((response) => response.json())
            .then((json) => {
                refreshDayBlockDialogEventContainer(new Date(Number(dayBlockDialog.dataset.targetId)));
                refreshCalendar();
            });
    }
});

const newEventButton = document.getElementById("new_event_btn");
newEventButton.addEventListener("click", event => {
    if (newEditEventDialog.classList.contains("edit"))
        newEditEventDialog.classList.remove("edit");

    newEditEventDialog.classList.add("new");

    const targetDayBlock = document.getElementById(dayBlockDialog.dataset.targetId);

    document.getElementById("event_title_input").value = "";
    setDateTimeInput("event_start_date_input", new Date(Number(targetDayBlock.dataset.year), Number(targetDayBlock.dataset.month) - 1, Number(targetDayBlock.dataset.day), 8));
    setDateTimeInput("event_end_date_input", new Date(Number(targetDayBlock.dataset.year), Number(targetDayBlock.dataset.month) - 1, Number(targetDayBlock.dataset.day), 9));
    document.getElementById("event_content_textarea").value = "";

    newEditEventDialog.showModal();
});

const deleteEventDialog = document.getElementById("delete_event_dialog");
deleteEventDialog.addEventListener("submit", event => {
    deleteEvent(deleteEventDialog.dataset.targetId);
    deleteEventDialog.dataset.targetId = "";
});

const monthDiv = document.getElementById("month");
monthDiv.addEventListener("click", event => {
    scrollSelectorDialog.appendChild(scrollSelector.create(allmonths));
    scrollSelectorDialog.showModal();

    scrollSelector.onSelectedIndexChange = selectedIndex => {
        curSelectedMonth = selectedIndex;
    };
    scrollSelector.select(allmonths.indexOf(allmonths[curSelectedMonth]));
});

const yearDiv = document.getElementById("year");
yearDiv.addEventListener("click", event => {
    scrollSelectorDialog.appendChild(scrollSelector.create(allYears));
    scrollSelectorDialog.showModal();

    scrollSelector.onSelectedIndexChange = selectedIndex => {
        curSelectedYear = Number(allYears[selectedIndex]);
    };
    scrollSelector.select(allYears.indexOf(curSelectedYear));
});

const calendarDays = document.getElementById("calendar_days");

let curSelectedMonth = today.getMonth(); // Date object's month start with 0
let curSelectedYear = today.getFullYear();

monthDiv.innerText = allmonths[curSelectedMonth];
yearDiv.innerText = curSelectedYear.toString();

const startDatetime = document.getElementById("event_start_date_input");
startDatetime.addEventListener("change", event => {
    document.getElementById("event_end_date_input").setAttribute("min", startDatetime.value);
    document.getElementById("event_end_date_input").value = startDatetime.value;
});

refreshCalendar();

function refreshCalendar() {
    fetch("/AllEventDatesInMonth", {
        method: "POST",
        body: JSON.stringify(
            curSelectedYear + "/" + ((curSelectedMonth + 1) > 9 ? "" : "0") + (curSelectedMonth + 1) + "/01 00:00:00:000"
        ), // format: yyyy/mm/dd hh:mm:ss:fff
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((jsonList) => {
            calendarDays.innerHTML = "";
            let curSelectedMonthDays = getDaysInMonth(curSelectedMonth, curSelectedYear);
            for (let i = 0; i < curSelectedMonthDays[0].getDay(); i++) {
                calendarDays.appendChild(document.createElement("div"));
            }
            for (const date of curSelectedMonthDays) {
                calendarDays.appendChild(createDayBlock(date));
            }

            if (jsonList != null) {
                for (const dateString of jsonList) {
                    const id = Date.parse(dateString).toString();
                    document.getElementById(id).children[0].classList.add("show");
                }
            }
        });
}

function getDaysInMonth(month, year) {
    var date = new Date(year, month, 1);
    var days = [];
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
}

function setDateTimeInput(id, date) {
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    document.getElementById(id).value = date.toISOString().slice(0, 16);
}

function createDayBlock(date) {
    const dayBlock = document.createElement("div");
    dayBlock.id = date.getTime();
    dayBlock.dataset.day = date.getDate();
    dayBlock.dataset.month = date.getMonth() + 1; // Date object's month start with 0
    dayBlock.dataset.year = date.getFullYear();
    dayBlock.dataset.week = date.getDay();
    dayBlock.innerText = date.getDate();
    dayBlock.classList.add("day-block");
    dayBlock.addEventListener("click", event => {
        dayBlockDialog.dataset.targetId = dayBlock.id;

        refreshDayBlockDialogEventContainer(date);

        // move dayBlockDialog to dayBlock's position
        const dayBlockRect = dayBlock.getBoundingClientRect();
        dayBlockDialog.style.transition = "";
        dayBlockDialog.style.left = dayBlockRect.x + "px";
        dayBlockDialog.style.top = dayBlockRect.y + "px";
        dayBlockDialog.style.transformOrigin = "left top";
        dayBlockDialog.showModal();
        dayBlockDialog.style.transform = "scale(" + (dayBlockRect.width / dayBlockDialog.offsetWidth * 100.0) + "%, " + (dayBlockRect.height / dayBlockDialog.offsetHeight * 100.0) + "%)";
        dayBlockDialog.style.opacity = "0";

        setTimeout(() => {
            // move to center
            dayBlockDialog.style.transition = "all 0.3s";
            dayBlockDialog.style.left = "50%";
            dayBlockDialog.style.top = "50%";
            dayBlockDialog.style.transform = "translate(-50%, -50%) scale(100%, 100%)";
            dayBlockDialog.style.opacity = "100%";

            setTimeout(() => {
                // show date
                const dayBlockDialogDate = document.getElementById("day_block_dialog_date");
                dayBlockDialogDate.children[0].children[1].innerText = weekNames[Number(dayBlock.dataset.week)];

                dayBlockDialogDate.children[1].children[0].innerText = dayBlock.dataset.year;
                dayBlockDialogDate.children[1].children[1].innerText = dayBlock.dataset.month + "-" + dayBlock.dataset.day;
                dayBlockDialogDate.classList.add("show");
            }, 300);
        }, 50);
    });

    const eventTag = document.createElement("div");
    eventTag.classList.add("event-tag");
    dayBlock.appendChild(eventTag);

    return dayBlock;
}

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

function refreshDayBlockDialogEventContainer(date) {
    const eventContainer = document.getElementById("day_block_dialog_event_container");
    eventContainer.innerHTML = "";

    getCalendarEventsInDay(date)
        .then(calendarEventList => {
            if (calendarEventList === null)
                return;

            for (const calendarEvent of calendarEventList) {
                const eventDiv = document.createElement("div");
                eventDiv.id = calendarEvent.eventId;
                eventDiv.classList.add("event");
                eventDiv.addEventListener("click", event => {
                    // prevent open when click the button
                    if (event.target.localName === "i" || event.target.localName === "button")
                        return;

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

                const toolButtonContainer = document.createElement("div");
                toolButtonContainer.classList.add("tool-button-container");

                const editButton = document.createElement("button");
                editButton.classList.add("edit-button");
                editButton.title = "Edit";
                editButton.innerHTML = "<i class=\"bi bi-pencil-fill\"></i>"
                editButton.addEventListener("click", event => {
                    if (newEditEventDialog.classList.contains("new"))
                        newEditEventDialog.classList.remove("new");

                    newEditEventDialog.classList.add("edit");
                    newEditEventDialog.dataset.targetId = calendarEvent.eventId;

                    document.getElementById("event_title_input").value = calendarEvent.eventName;
                    setDateTimeInput("event_start_date_input", new Date(startDate));
                    setDateTimeInput("event_end_date_input", new Date(endDate));
                    document.getElementById("event_content_textarea").value = calendarEvent.eventContent;

                    newEditEventDialog.showModal();
                });
                toolButtonContainer.appendChild(editButton);

                const deleteButton = document.createElement("button");
                deleteButton.classList.add("delete-button");
                deleteButton.title = "Delete";
                deleteButton.innerHTML = "<i class=\"bi bi-trash-fill\"></i>"
                deleteButton.addEventListener("click", event => {
                    deleteEventDialog.dataset.targetId = calendarEvent.eventId;
                    deleteEventDialog.showModal();
                });
                toolButtonContainer.appendChild(deleteButton);

                eventDiv.appendChild(toolButtonContainer);

                eventContainer.appendChild(eventDiv);
            }
        });

}

function deleteEvent(eventId) {
    fetch("/DeleteEvent", {
        method: "POST",
        body: JSON.stringify(eventId),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    })
        .then((response) => response.json())
        .then((json) => {
            refreshCalendar();
        });
    
    const eventDiv = document.getElementById(eventId);
    eventDiv.classList.add("delete");
    setTimeout(() => {
        eventDiv.remove();
    }, 500);
}
