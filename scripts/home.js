loadTimeline("Timeline: Your Home Timeline").then(async timeline => {
  console.log("Home timeline loaded");
  await initialTimelineRead(timeline);
  monitorTimeline(timeline);
}).catch(error => {
  console.error("Error loading timeline:", error);
});