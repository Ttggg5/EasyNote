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

let curSelectedMonth = today.getMonth();
let curSelectedYear = today.getFullYear();

monthDiv.innerText = allmonths[curSelectedMonth];
yearDiv.innerText = curSelectedYear.toString();

refreshCalendar()

function refreshCalendar() {
    calendarDays.innerHTML = "";
    let curSelectedMonthDays = getDaysInMonth(curSelectedMonth, curSelectedYear);
    for (let i = 0; i < curSelectedMonthDays[0].getDay(); i++) {
        calendarDays.appendChild(document.createElement("div"));
    }
    for (const date of curSelectedMonthDays) {
        calendarDays.appendChild(createDayBlock(date));
    }
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
    dayBlock.dataset.day = date.getDate();
    dayBlock.dataset.month = date.getMonth();
    dayBlock.dataset.year = date.getFullYear();
    dayBlock.innerText = date.getDate()
    dayBlock.classList.add("day-block");

    return dayBlock;
}
