async function getPoastDetails(tweet) {
    const posterTagElement = tweet.querySelector('div[data-testid="User-Name"] > div > div > a')
    if (posterTagElement === null) return null;

    const tweetLinkElement = tweet.querySelector('div > div > div > div > div > article > div > div > div:nth-child(3) > div:nth-child(4) > div > div > div > div > a')
    if (tweetLinkElement === null) return null;

    const tweetTimeElement = tweetLinkElement.querySelector('time');

    let tweetImages = await getTweetImages(tweet);
    let quotePost = null;

    const quotePostElement = tweet.querySelector("div[aria-labelledby] > div[id]");
    if (quotePostElement) {
        quotePost = await getQuotePostDetails(quotePostElement);
        if (quotePost?.images) {
            tweetImages = tweetImages.filter(tweetImage => !quotePost.images.includes(tweetImage));
        }
    }

    const output = {
        poster: posterTagElement.href,
        link: tweetLinkElement.href,
        time: tweetTimeElement.getAttribute('datetime'),
        images: tweetImages,
        quotePost
    }

    return output
}

async function initialTimelineRead(timeline) {
    const tweets = [...timeline.childNodes]

    const poastDetails = await getPoastDetails(tweets.shift())
    const detailsList = await Promise.all(
        tweets.map(tweet => { return getTweetDetails(tweet) })
    )

    detailsList.unshift(poastDetails)
    await Promise.all([
        sendDetails(detailsList),
        isCreator ? embedCreatorTweets(detailsList) : Promise.resolve()
    ])
}

loadTimeline("Timeline: Conversation").then(async timeline => {
    console.log("Poast timeline loaded")
    await initialTimelineRead(timeline)
    monitorTimeline(timeline)
}).catch(error => {
    console.error("Error loading timeline:", error)
})