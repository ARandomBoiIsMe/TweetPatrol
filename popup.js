const baseURL = "http://localhost:8080/"

const tabs = document.querySelectorAll(".tab")
const tabButtons = document.querySelectorAll(".tab-buttons button")

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        tabButtons.forEach(btn => btn.classList.remove("active"))
        tabs.forEach(tab => tab.classList.remove("active"))

        button.classList.add("active")
        const targetTab = document.getElementById(button.id.replace("-tab", ""))
        targetTab.classList.add("active")
    })
})

const dashboardButton = document.getElementById("view-dashboard")

dashboardButton.addEventListener("click", () => {
    window.open(`${baseURL}creator/dashboard`)
})

document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["extension", "popups"], (result) => {
        const extensionStatus = result.extension === undefined ? true : result.extension === "on";
        const popupsStatus = result.popups === undefined ? true : result.popups === "on";

        document.getElementById("ext-enable").checked = extensionStatus;
        document.getElementById("show-popups").checked = popupsStatus;

        if (result.extension === undefined) {
            chrome.storage.local.set({ extension: "on" });
        }
        if (result.popups === undefined) {
            chrome.storage.local.set({ popups: "on" });
        }
    });
});

const enableExtension = document.getElementById("ext-enable");
const showPopups = document.getElementById("show-popups");

enableExtension.addEventListener("click", async () => {
    if (enableExtension.checked) {
        await chrome.storage.local.set({ extension: "on" }).then(() => console.log("Extension on"));
    } else {
        await chrome.storage.local.set({ extension: "off" }).then(() => console.log("Extension off"));
    }
});

showPopups.addEventListener("click", async () => {
    if (showPopups.checked) {
        await chrome.storage.local.set({ popups: "on" }).then(() => console.log("Popups on"));
    } else {
        await chrome.storage.local.set({ popups: "off" }).then(() => console.log("Popups off"));
    }
});