const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/duration"));
const customParseFormat = require("dayjs/plugin/customParseFormat");
dayjs.extend(customParseFormat);
const utc = require("dayjs/plugin/utc");
dayjs.extend(utc);

const ioHook = window.require("iohook");
const API_URL = "https://testing.ecotrack.co.in";
const dropdown = document.getElementById("dropdown");
const logoutButton = document.getElementById("logout-btn");
const punchInButton = document.getElementById("punch-in-btn");
const pauseButton = document.getElementById("pause-btn");
const mainScreen = document.getElementById("main-screen");
const loginScreen = document.getElementById("login-screen");
const olderDataScreen = document.getElementById("older-data");
const successAlert = document.getElementById("successAlert");
const errorAlert = document.getElementById("errorAlert");
const productivityTimeLbl = document.getElementById("productivityTime");
const idleTimeLbl = document.getElementById("idleTime");
const breakTimeLbl = document.getElementById("breakTime");
const usernameLbl = document.getElementById("display-user-name");
const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");
let isPunchedOut = false;
let ispunchedIn = false;
let productivityTime = 0;
let idleTime = 0;
let breakTime = 0;
let isBreak = false;
let isTimerRunning = 0;
let serverUpdater = 0;
const interval = 30;
let user = {};

setUser = (data) => {
  user = data;
  console.log(user);
};
function convertSecondsToTime(seconds) {
  const duration = dayjs.duration(seconds, "seconds");
  const formattedTime = dayjs.utc(duration.asMilliseconds()).format("HH:mm:ss");
  return formattedTime;
}
function renderData(data) {
  // Create the main container element

  const container = document.createElement("div");
  container.classList.add("flex", "w-full", "h-60", "px-5", "py-5");

  const detailsContainer = document.createElement("details");
  detailsContainer.style.cssText = `
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    list-style: none !important;
  `;
  const summaryContainer = document.createElement("summary");
  summaryContainer.style.cssText = `
    cursor: pointer !important;
    outline: none !important;
    background-color: #e2e8f0 !important;
    padding: 10px !important;
    border-radius: 5px !important;
    list-style: none !important;
  `;
  // Create the date label element
  const dateContainer = document.createElement("div");
  dateContainer.classList.add("flex", "flex-row", "w-full", "justify-between");

  const dateLabel = document.createElement("label");
  dateLabel.style.cssText = `
  font-size: 1.2rem;
    color: #333;
    font-weight: bold;
    list-style: none !important;
  `;
  const totalHours = document.createElement("label");
  dateLabel.textContent = data.date_;
  totalHours.textContent = data.work ? `${data?.work?.substr(0, 5)} ` : "None";

  totalHours.style.cssText = `
    font-size: 1.2rem;
    color: #333;
    font-weight: bold;
    list-style: none !important;
  `;

  dateContainer.appendChild(dateLabel);
  dateContainer.appendChild(totalHours);
  summaryContainer.appendChild(dateContainer);

  // Create the flex container for productivity, idle, and break
  const flexContainer = document.createElement("div");
  flexContainer.style.flex = "1";
  flexContainer.style.display = "flex";
  flexContainer.style.flexDirection = "column";
  flexContainer.style.justifyContent = "space-between";
  flexContainer.style.marginTop = "2px";
  flexContainer.style.padding = "5px";
  container.appendChild(flexContainer);

  // Create the productivity element
  const productivityContainer = createDataElement(data.work, "Productivity");
  flexContainer.appendChild(productivityContainer);

  // Create the idle element
  const idleContainer = createDataElement(data.idle, "Idle");
  flexContainer.appendChild(idleContainer);

  // Create the break element
  const breakContainer = createDataElement(data.break, "Break");
  flexContainer.appendChild(breakContainer);

  // Append the container to the main data container
  const dataContainer = document.getElementById("data-container");
  detailsContainer.appendChild(summaryContainer);
  detailsContainer.appendChild(container);

  olderDataScreen.appendChild(detailsContainer);
}
function createDataElement(value, label) {
  const dataElementContainer = document.createElement("div");
  dataElementContainer.classList.add(
    "flex",
    "flex-row",
    "w-full",
    "justify-between",
    "rounded-md"
  );
  dataElementContainer.style.marginTop = "2px";

  const dataElement = document.createElement("div");
  const dataElementLbl = document.createElement("div");
  dataElement.classList.add("time-ball");
  dataElementLbl.classList.add("time-ball");
  const dataElementText = document.createElement("p");
  // dataElementText.classList.add("time-ball");
  if (label === "Productivity") {
    dataElementContainer.classList.add("bg-green-200");
  } else if (label === "Idle") {
    dataElementContainer.classList.add("bg-red-200");
  } else {
    dataElementContainer.classList.add("bg-yellow-200");
  }
  dataElementText.textContent = !value ? "None" : `${value.substr(0, 5)} `;

  const dataElementLabel = document.createElement("p");
  dataElementLabel.classList.add("text-blue-800", "font-bold", "pl-2");
  dataElementLabel.textContent = label;

  dataElementLbl.appendChild(dataElementLabel);
  dataElement.appendChild(dataElementText);
  dataElementContainer.appendChild(dataElementLbl);
  dataElementContainer.appendChild(dataElement);

  return dataElementContainer;
}
function updateOlderData() {
  fetch(`${API_URL}/emp-attendance`, {
    headers: {
      "x-access-token": user["token"],
    },
  })
    .then((res) => res.json())
    .then((data) => {
      // render this data on uri
      olderDataScreen.innerHTML = "";
      console.log(data);
      data.forEach(renderData);
    });
}
function getPrevStatesTime() {
  const productivity = localStorage.getItem("productivityTime");
  const idle = localStorage.getItem("idleTime");
  const breakT = localStorage.getItem("breakTime");
  if (productivity) {
    productivityTime = productivity;
  }
  if (idle) {
    idleTime = idle;
  }
  if (breakT) {
    breakTime = breakT;
  }
}
function saveStateTime() {
  localStorage.setItem("productivityTime", productivityTime);
  localStorage.setItem("idleTime", idleTime);
  localStorage.setItem("breakTime", breakTime);
}
function punchResetValues() {
  localStorage.removeItem("productivityTime");
  localStorage.removeItem("idleTime");
  localStorage.removeItem("breakTime");
  clearInterval(isTimerRunning);
  clearInterval(serverUpdater);
}
function displayUserName() {
  usernameLbl.innerText = user["name"];
}
function trackTime() {
  if (isBreak) {
    breakTime++;
    updateTimesOnUi();
    return;
  }

  const currentTime = dayjs();
  const lastTrackedTime = localStorage.getItem("lastEvent");
  const duration = currentTime.diff(lastTrackedTime, "second");

  if (duration <= 10) {
    productivityTime++;
  } else {
    idleTime++;
  }

  updateTimesOnUi();
}
function updateTimesOnUi() {
  let formattedProductivity = "";
  let formattedIdleTime = "";
  let formattedBreak = "";

  formattedProductivity = convertSecondsToTime(productivityTime);
  formattedIdleTime = convertSecondsToTime(idleTime);
  formattedBreak = convertSecondsToTime(breakTime);
  productivityTimeLbl.innerText = formattedProductivity;
  idleTimeLbl.innerText = formattedIdleTime;
  breakTimeLbl.innerText = formattedBreak;
  saveStateTime();
}
function updateTimesOnServer() {
  const formData = new FormData();
  formData.append("work", convertSecondsToTime(productivityTime));
  formData.append("idle", convertSecondsToTime(idleTime));
  formData.append("break", convertSecondsToTime(breakTime));
  fetch(`${API_URL}/emp-attendance/punch-in`, {
    method: "PATCH",
    headers: {
      "x-access-token": user["token"],
    },
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("values update response :", data);
    });
}
function getTodayDetails() {
  fetch(`${API_URL}/emp-attendance/today`, {
    headers: {
      "x-access-token": user["token"],
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data) {
        const { work, idle, break: breakT } = data;
        if (!work) {
          productivityTime = 0;
        } else {
          productivityTime = convertTimeToSeconds(work?.trim());
        }

        if (!idle) {
          idleTime = 0;
        } else {
          idleTime = convertTimeToSeconds(idle?.trim());
        }
        if (!breakT) {
          breakTime = 0;
        } else {
          breakTime = convertTimeToSeconds(breakT?.trim());
        }

        saveStateTime();
        updateTimesOnUi();
      }
    });
}
function getCurState() {
  fetch(`${API_URL}/emp-attendance/curr-state`, {
    headers: {
      "x-access-token": user["token"],
    },
  })
    .then((res) => res.json())
    .then((data) => {
      ispunchedIn = data["punch_in"];
      isPunchedOut = data["punch_out"];
      if (!ispunchedIn && !isPunchedOut) {
        punchInButton.innerText = "PUNCH IN";
        punchInButton.disabled = false;
        pauseButton.disabled = true;
      }

      if (ispunchedIn && !isPunchedOut) {
        punchInButton.innerText = "PUNCH OUT";
        punchInButton.disabled = false;

        isTimerRunning = setInterval(trackTime, 1000);
        pauseButton.disabled = false;
        updateTimesOnServerJob();
      }
      if (isPunchedOut) {
        punchInButton.innerText = "PUNCH OUT";
        punchInButton.disabled = true;
        pauseButton.disabled = true;
        errorAlert.innerText = "Already Punched Out";
        showErrorAlert();

        clearInterval(isTimerRunning);
        clearInterval(serverUpdater);
      }
    });
}
function convertTimeToSeconds(timeString) {
  const duration = dayjs.duration(
    dayjs(timeString, "HH:mm:ss").diff(dayjs().startOf("day"))
  );
  return duration.asSeconds();
}
function updateTimesOnServerJob() {
  serverUpdater = setInterval(updateTimesOnServer, interval * 1000);
}
// get user data from credentials file.
window.addEventListener("load", function () {
  const data = localStorage.getItem("user");
  if (!data) {
    mainScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    return;
  }
  setUser(JSON.parse(data));
  if (user?.token) {
    mainScreen.classList.remove("hidden");
    loginScreen.classList.add("hidden");
    displayUserName();
    getCurState();
    getPrevStatesTime();
    // getPunchedInTime();
    updateTimesOnUi();
    updateOlderData();
  } else {
    mainScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  }
});

// ------------------------- Punch Button Functionality--------------------------------

const punch = () => {
  if (punchInButton.innerText === "PUNCH IN") {
    punchIn();
  } else {
    punchOut();
  }
};
const punchIn = () => {
  fetch(`${API_URL}/emp-attendance/punch-in`, {
    method: "POST",
    headers: {
      "x-access-token": user["token"],
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.message === "Punched In") {
        successAlert.innerText = "Punched In";
        successAlert.classList.remove("hidden");
        isTimerRunning = setInterval(trackTime, 1000);
        pauseButton.disabled = false;
        punchInButton.innerText = "PUNCH OUT";
        updateTimesOnServerJob();

        setTimeout(() => {
          successAlert.classList.add("hidden");
          successAlert.innerText = "Success";
        }, 3000);
      } else if (data.error === "Already punched in") {
        successAlert.innerText = "Already punched in";
        successAlert.classList.remove("hidden");
        setTimeout(() => {
          successAlert.classList.add("hidden");
          successAlert.innerText = "Success";
        }, 3000);
      } else {
        errorAlert.classList.remove("hidden");
        errorAlert.innerText = data.error;
        setTimeout(() => {
          errorAlert.classList.add("hidden");
        }, 3000);
      }
    })
    .catch((err) => {
      if (err.error === "Already punched in") {
        successAlert.classList.remove("hidden");
        setTimeout(() => {
          punchInButton.innerText = "PUNCH OUT";
          successAlert.classList.add("hidden");
        }, 3000);
      }
      console.log(err);
    });
};
const punchOut = () => {
  fetch(`${API_URL}/emp-attendance/punch-out`, {
    method: "POST",
    headers: {
      "x-access-token": user["token"],
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.message === "Punched Out") {
        successAlert.classList.remove("hidden");
        pauseButton.disabled = true;
        punchInButton.innerText = "PUNCH OUT";
        punchInButton.disabled = true;
        pauseButton.disabled = true;
        clearInterval(isTimerRunning);
        clearInterval(serverUpdater);
        setTimeout(() => {
          successAlert.classList.add("hidden");
          punchInButton.innerText = "PUNCH IN";
        }, 3000);
      } else if (data.error === "Already punched out") {
        successAlert.classList.remove("hidden");
        pauseButton.disabled = true;
        setTimeout(() => {
          successAlert.classList.add("hidden");
          punchInButton.innerText = "PUNCH IN";
        }, 3000);
        clearInterval(isTimerRunning);
        clearInterval(serverUpdater);
      } else {
        errorAlert.classList.remove("hidden");
        setTimeout(() => {
          errorAlert.classList.add("hidden");
        }, 3000);
      }
    })
    .catch((err) => {
      if (err.error === "Already punched out") {
        successAlert.classList.remove("hidden");
        setTimeout(() => {
          successAlert.classList.add("hidden");
        }, 3000);
      }
    });
};

punchInButton.addEventListener("click", punch);

const build = () => {
  ioHook.on("mousemove", (event) => {
    const lastTrackedTime = localStorage.setItem(
      "lastEvent",
      dayjs().toISOString()
    );
  });
  ioHook.on("mouseclick", (event) => {
    const lastTrackedTime = localStorage.setItem(
      "lastEvent",
      dayjs().toISOString()
    );
  });
  ioHook.on("keydown", (event) => {
    localStorage.setItem("lastEvent", dayjs().toISOString());
  });
  ioHook.start(true);
};

build();

// -------------------------------------------------- Pause --------------------------------------------------
pause = () => {
  if (pauseButton.innerText === "Start Work") {
    pauseButton.innerText = "Take A Break";
    pauseButton.classList.replace("startWorkBtn", "btn_md");
    isBreak = false;
    return;
  }
  pauseButton.innerText = "Start Work";
  pauseButton.classList.replace("btn_md", "startWorkBtn");
  isBreak = true;
};
pauseButton.addEventListener("click", pause);

// -------------------------------------------------- Logout --------------------------------------------------
logout = () => {
  setUser({});
  punchResetValues();
  dropdown.attributes.removeNamedItem("open");
  localStorage.clear();
  mainScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
};
logoutButton.addEventListener("click", logout);

// -------------------------------------------------- Login Form --------------------------------------------------
document
  .getElementById("loginForm")
  .addEventListener("submit", handleLoginForm);
function handleLoginForm(event) {
  event.preventDefault();
  var username = document.getElementById("username").value;
  var password = document.getElementById("password").value;
  const formData = new FormData(event.target);
  formData.append("username", username);
  formData.append("password", password);
  fetch(`${API_URL}/login`, {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((result) => {
      if (!result.token) {
        showErrorAlert();
        return;
      }
      showSuccessAlert();
      setUser(result);
      localStorage.setItem("user", JSON.stringify(result));
      setTimeout(() => {
        mainScreen.classList.remove("hidden");
        loginScreen.classList.add("hidden");

        displayUserName();
        getCurState();
        getTodayDetails();

        // getPrevStatesTime();
        // getPunchedInTime();
        updateTimesOnUi();
        updateOlderData();
      }, 1000);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

//-------------------------------------------------- Alert --------------------------------------------------
function showSuccessAlert() {
  successAlert.classList.remove("hidden");

  setTimeout(function () {
    successAlert.classList.add("hidden");
  }, 3000);
}

function showErrorAlert() {
  errorAlert.classList.remove("hidden");
  setTimeout(function () {
    errorAlert.classList.add("hidden");
  }, 3000);
}

// -------------------------------------------------- Modal --------------------------------------------------
const modal = document.getElementById("leaveModal");
const modalBtn = document.getElementById("openModalBtn");
const closeBtn = document.getElementsByClassName("close")[0];
const leaveForm = document.getElementById("leaveForm");

const tomorrow = dayjs().add(1, "day").format("YYYY-MM-DD");
const dayAfterTomorrow = dayjs().add(2, "day").format("YYYY-MM-DD");
// Set the min attribute of the "from" date input to tomorrow's date
fromDateInput.setAttribute("min", tomorrow);
toDateInput.setAttribute("min", dayAfterTomorrow);

fromDateInput.addEventListener("input", () => {
  const fromDate = dayjs(fromDateInput.value);
  const toDate = dayjs(toDateInput.value);

  if (toDate.isValid() && fromDate.isAfter(toDate)) {
    toDateInput.setCustomValidity("From date should be before the to date.");
  } else {
    toDateInput.setCustomValidity("");
  }
});
toDateInput.addEventListener("input", () => {
  const fromDate = dayjs(fromDateInput.value);
  const toDate = dayjs(toDateInput.value);

  if (fromDate.isAfter(toDate)) {
    toDateInput.setCustomValidity("From date should be before the to date.");
  } else {
    toDateInput.setCustomValidity("");
  }
});

function openModal() {
  modal.style.display = "block";
}

function closeModal() {
  modal.style.display = "none";
}

// Function to handle form submission
function submitLeaveForm(event) {
  event.preventDefault();

  const leaveForm = document.getElementById("leaveForm");
  const formData = new FormData(leaveForm);
  const data = {};
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }
  const formD = new FormData();
  formD.append("from_date", data["from_date"]);
  formD.append("to_date", data["to_date"]);
  formD.append("reason", data["reason"]);
  formD.append("leave_type", data["leave_type"]);
  formD.append("paid", data["paid"]);

  fetch(`${API_URL}/emp-attendance/leave`, {
    method: "POST",
    headers: {
      "x-access-token": user["token"],
    },
    body: formD,
  })
    .then((res) => res.json())
    .then((data) => {
      successAlert.classList.remove("hidden");
      successAlert.innerText = "Request Submitted!";

      setTimeout(() => {
        successAlert.classList.add("hidden");
        successAlert.innerText = "Success!";
      }, 3000);
    });

  // Close the modal after form submission
  closeModal();
}

// Add an event listener to the form submission
// const leaveForm = document.getElementById("leaveForm");
leaveForm.addEventListener("submit", submitLeaveForm);

// Event listeners
modalBtn.addEventListener("click", openModal);
closeBtn.addEventListener("click", closeModal);
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    return;
  }
});


// -------------------------------Auto Updater---------------------------
const notification = document.getElementById('notification');
const message = document.getElementById('message');
const restartButton = document.getElementById('restart-button');
ipcRenderer.on('update_available', () => {
  ipcRenderer.removeAllListeners('update_available');
  message.innerText = 'A new update is available. Downloading now...';
  notification.classList.remove('hidden');
});
ipcRenderer.on('update_downloaded', () => {
  ipcRenderer.removeAllListeners('update_downloaded');
  message.innerText = 'Update Downloaded. It will be installed on restart. Restart now?';
  restartButton.classList.remove('hidden');
  notification.classList.remove('hidden');
});
function closeNotification() {
  notification.classList.add('hidden');
}
function restartApp() {
  ipcRenderer.send('restart_app');
}