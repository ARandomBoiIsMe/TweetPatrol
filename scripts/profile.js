async function loadTimeline() {
    let timeline = null
    let attempts = 0
    let maxAttempts = 10

    while (timeline === null && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000))
        timeline = document.querySelector('[aria-label^="Timeline:"] > div')
        attempts++
    }

    if (timeline === null) { throw new Error(`Timeline not found - Profile timeline`) }

    return timeline
}

loadTimeline().then(async timeline => {
    console.log("Profile timeline loaded");
    await initialTimelineRead(timeline);
    monitorTimeline(timeline);
}).catch(error => {
    console.error("Error loading timeline:", error);
});