async function getPoastDetails(tweet) {
    const posterTagElement = tweet.querySelector('div[data-testid="User-Name"] > div > div > a')
    if (posterTagElement === null) { return }
    const poster = posterTagElement.href

    const tweetLinkElement = tweet.querySelector('div > div > div > div > div > article > div > div > div:nth-child(3) > div:nth-child(4) > div > div > div > div > a')
    if (tweetLinkElement === null) { return }
    const tweetLink = tweetLinkElement.href

    const tweetTimeElement = tweetLinkElement.querySelector('time')
    const tweetTime = tweetTimeElement.getAttribute('datetime')

    const tweetImages = await getTweetImages(tweet)

    const output = {
        poster: poster,
        link: tweetLink,
        time: tweetTime,
        images: tweetImages
    }

    return output
}

async function initialTimelineRead(timeline) {
    tweets = [...timeline.childNodes]

    const poastDetails = getPoastDetails(tweets.shift())
    const detailsList = tweets.map(tweet => {
        return getTweetDetails(tweet)
    })

    detailsList.unshift(poastDetails)
    await sendDetails(detailsList)
}

loadTimeline("Timeline: Conversation").then(async timeline => {
    console.log("Poast timeline loaded")
    await initialTimelineRead(timeline)
    monitorTimeline(timeline)
}).catch(error => {
    console.error("Error loading timeline:", error)
})