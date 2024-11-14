loadTimeline("Timeline: Search timeline").then(async timeline => {
    console.log("Search timeline loaded");
    await initialTimelineRead(timeline);
    monitorTimeline(timeline);
}).catch(error => {
    console.error("Error loading timeline:", error);
});