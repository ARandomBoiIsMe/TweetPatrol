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
    const baseURL = "http://localhost:8080/"
    window.open(`${baseURL}creator/dashboard`)
})