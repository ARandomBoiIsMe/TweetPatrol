async function loadTimeline() {
    let timeline = null
    let attempts = 0
    let maxAttempts = 50

    while (timeline === null && attempts < maxAttempts) {
        timeline = document.querySelector('[aria-label^="Timeline:"] > div')

        if (timeline && timeline.childNodes.length > 0) {
            const post = timeline.querySelector('[data-testid="cellInnerDiv"]');
            if (post) {
                await new Promise(r => setTimeout(r, 1000));
                return timeline;
            }
        }

        attempts++;
        await new Promise(r => setTimeout(r, CONFIG.timelineLoadInterval));
    }

    if (!timeline) {
        throw new Error(`Timeline not found - ${timelineLabel}`);
    }

    const progressbar = timeline.querySelector('[role="progressbar"]')
    if (progressbar) {
        await new Promise(r => setTimeout(r, 1000));
        timeline = document.querySelector('[aria-label^="Timeline:"] > div')
    } else {
        await new Promise(r => setTimeout(r, 1000));
    }

    return timeline;
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