async function loadTimeline() {
    let timeline = null
    let attempts = 0
    let maxAttempts = 50

    while (timeline === null && attempts < maxAttempts) {
        timeline = document.querySelector('[aria-label^="Timeline:"] > div')
        attempts++
        await new Promise(r => setTimeout(r, 200))
    }

    if (timeline === null) { throw new Error(`Timeline not found - Profile timeline`) }

    return timeline
}

loadTimeline().then(async timeline => {
    const extensionEnabled = await isExtensionEnabled()
    if (!extensionEnabled) return
    
    console.log("Profile timeline loaded");

    const isCreator = await isUserACreator()

    await initialTimelineRead(timeline, isCreator);
    monitorTimeline(timeline, isCreator);
}).catch(error => {
    console.error("Error loading timeline:", error);
});