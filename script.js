const tabs = document.querySelectorAll(".tab");
const tabButtons = document.querySelectorAll(".tabs button");

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        tabButtons.forEach(btn => btn.classList.remove("active"));
        tabs.forEach(tab => tab.classList.remove("active"));

        button.classList.add("active");
        const targetTab = document.getElementById(button.id + "-tuts");
        targetTab.classList.add("active");
    });
});