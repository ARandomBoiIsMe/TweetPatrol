loadTimeline("Timeline: Search timeline").then(async timeline => {
    console.log("Search timeline loaded");

    const isCreator = await isUserACreator()

    await initialTimelineRead(timeline, isCreator);
    monitorTimeline(timeline, isCreator);
}).catch(error => {
    console.error("Error loading timeline:", error);
});