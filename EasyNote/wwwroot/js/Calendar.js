const scrollSelector = new ScrollSelector();
const today = new Date();
const allmonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const allYears = [];
for (let i = today.getFullYear() - 80; i <= today.getFullYear() + 20; i++) {
    allYears.push(i);
}

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

refreshCalendar();

function refreshCalendar() {
    fetch("/AllEventDateInMonth", {
        method: "POST",
        body: JSON.stringify(curSelectedYear + "/" + ((curSelectedMonth + 1) > 9 ? "" : "0") + (curSelectedMonth + 1) + "/01 00:00:00:000"), // format: yyyy/mm/dd hh:mm:ss:fff
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

function createDayBlock(date) {
    const dayBlock = document.createElement("div");
    dayBlock.id = date.getTime();
    dayBlock.dataset.day = date.getDate();
    dayBlock.dataset.month = date.getMonth() + 1; // Date object's month start with 0
    dayBlock.dataset.year = date.getFullYear();
    dayBlock.innerText = date.getDate();
    dayBlock.classList.add("day-block");
    dayBlock.addEventListener("click", event => {
        dayBlockDialog.dataset.targetId = dayBlock.id;

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
                dayBlockDialogDate.innerText = dayBlock.dataset.year + "-" + dayBlock.dataset.month + "-" + dayBlock.dataset.day;
                dayBlockDialogDate.classList.add("show");
            }, 300);
        }, 50);
    });

    const eventTag = document.createElement("div");
    eventTag.classList.add("event-tag");
    dayBlock.appendChild(eventTag);

    return dayBlock;
}
