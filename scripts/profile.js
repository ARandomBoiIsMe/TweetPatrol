async function loadTimeline() {
    let timeline = null;
    let attempts = 0;

    while (!timeline && attempts < CONFIG.maxTimelineLoadAttempts) {
        timeline = document.querySelector('[aria-label^="Timeline:"] > div')
        attempts++;
        await new Promise(r => setTimeout(r, CONFIG.timelineLoadInterval));
    }

    if (!timeline) {
        throw new Error(`Timeline not found - Profile timeline`);
    }

    for (let postAttempts = 0; postAttempts < CONFIG.maxTimelineLoadAttempts; postAttempts++) {
        const post = timeline.querySelector('[data-testid="cellInnerDiv"]');

        if (post) {
            await new Promise(r => setTimeout(r, CONFIG.timelinePopulationWaitTime));
            timeline = document.querySelector('[aria-label^="Timeline:"] > div')
            return timeline;
        }

        const progressbar = timeline.querySelector('[role="progressbar"]');
        if (progressbar) {
            await new Promise(r => setTimeout(r, CONFIG.timelineLoadInterval));
            timeline = document.querySelector('[aria-label^="Timeline:"] > div')
            continue;
        }

        await new Promise(r => setTimeout(r, CONFIG.timelineLoadInterval));
    }

    throw new Error(`No posts found in timeline - Profile timeline`);
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