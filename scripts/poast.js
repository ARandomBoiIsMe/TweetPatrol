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

async function embedCreatorPoastTweet(poastDetails) {
    const details = await processTweetDetails([poastDetails]);
    if (!details.length) return;

    const { Current_X_User } = await chrome.storage.local.get(["Current_X_User"]);

    details
        .filter(detail => detail.poster.replace('https://x.com/', '') === Current_X_User)
        .forEach(detail => {
            const link = document.querySelector(`a[href="${detail.link.replace('https://x.com', '')}"]`);
            const tweet = link?.closest('.css-175oi2r[data-testid="cellInnerDiv"]');

            if (!tweet || tweet.querySelector('.add-tweet')) return;

            const addTweet = createAddTweetElement(detail);
            const bookmarkElement = tweet.querySelector('div > div > article > div > div > div:nth-child(3) > div:nth-child(6) > div > div > div:nth-child(4)');
            bookmarkElement.parentNode.insertBefore(addTweet, bookmarkElement.nextSibling);
        });
}

async function initialTimelineRead(timeline, isCreator) {
    const tweets = [...timeline.childNodes]

    const poastDetails = await getPoastDetails(tweets.shift())
    const detailsList = await Promise.all(
        tweets.map(tweet => { return getTweetDetails(tweet) })
    )

    detailsList.unshift(poastDetails)
    await Promise.all([
        sendDetails(detailsList),
        isCreator ? embedCreatorPoastTweet(detailsList.shift()) : Promise.resolve(),
        isCreator ? embedCreatorTweets(detailsList) : Promise.resolve()
    ])
}

loadTimeline("Timeline: Conversation").then(async timeline => {
    const extensionEnabled = await isExtensionEnabled()
    if (!extensionEnabled) return
    
    console.log("Poast timeline loaded")

    const isCreator = await isUserACreator();

    await initialTimelineRead(timeline, isCreator);
    monitorTimeline(timeline, isCreator);
}).catch(error => {
    console.error("Error loading timeline:", error)
})