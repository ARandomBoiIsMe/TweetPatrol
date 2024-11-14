var baseURL = "http://localhost:8080/"

async function loadTimeline(timelineLabel) {
    let timeline = null
    let attempts = 0
    let maxAttempts = 10

    while (timeline === null && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000))
        timeline = document.querySelector(`[aria-label="${timelineLabel}"] > div`)
        attempts++
    }

    if (timeline === null) { throw new Error(`Timeline not found - ${timelineLabel}`) }

    return timeline
}

function getTweetImages(tweet) {
    return new Promise((resolve) => {
        const tweetImages = [];
        const images = tweet.querySelectorAll('img[alt="Image"]');

        if (images.length === 0) {
            const observer = new MutationObserver((_, obs) => {
                const newImages = tweet.querySelectorAll('img[alt="Image"]');
                if (newImages.length > 0) {
                    newImages.forEach(image => tweetImages.push(image.src));
                    obs.disconnect();
                    resolve(tweetImages);
                }
            });

            observer.observe(tweet, { childList: true, subtree: true });

            setTimeout(() => {
                observer.disconnect();
                resolve(tweetImages);
            }, 5000);
        } else {
            images.forEach(image => tweetImages.push(image.src));
            resolve(tweetImages);
        }
    });
}

async function getQuotePostDetails(quotePost) {
    const posterTagElement = quotePost.querySelector('div[data-testid="User-Name"] > div:nth-child(2) > div > div > div > div> span')
    if (posterTagElement === null) { return }
    const poster = posterTagElement.textContent.replace("@", "https://x.com/")

    const tweetLinkElement = quotePost.querySelector('a[role="link"]')
    if (tweetLinkElement === null) { return }
    const tweetLink = tweetLinkElement.href.replace(/\/photo\/\d+/g, '')

    const tweetTimeElement = quotePost.querySelector('time')
    const tweetTime = tweetTimeElement.getAttribute('datetime')

    const tweetImages = await getTweetImages(quotePost)

    const output = {
        poster: poster,
        link: tweetLink,
        time: tweetTime,
        images: tweetImages
    }

    return output
}

async function getTweetDetails(tweet) {
    const posterTagElement = tweet.querySelector('div[data-testid="User-Name"] > div:nth-child(2) > div > div > a')
    if (posterTagElement === null) { return }
    const poster = posterTagElement.href

    const tweetLinkElement = tweet.querySelector('div[data-testid="User-Name"] > div:nth-child(2) > div > div:nth-child(3) > a')
    if (tweetLinkElement === null) { return }
    const tweetLink = tweetLinkElement.href

    const tweetTimeElement = tweetLinkElement.querySelector('time')
    const tweetTime = tweetTimeElement.getAttribute('datetime')

    var tweetImages = await getTweetImages(tweet)
    var quotePost = undefined

    const quotePostElement = tweet.querySelector("div[aria-labelledby] > div[id]")
    if (quotePostElement) {
        quotePost = await getQuotePostDetails(quotePostElement)

        if (quotePost && quotePost.images) {
            tweetImages = tweetImages.filter(tweetImage => !quotePost.images.includes(tweetImage))
        }
    }

    const output = {
        poster: poster,
        link: tweetLink,
        time: tweetTime,
        images: tweetImages,
        quotePost: quotePost
    }

    return output
}

function createWarningBanner(result) {
    const warning = document.createElement('div');
    warning.className = 'stolen-tweet-warning';
    warning.style.backgroundColor = '#f8d7da';
    warning.style.border = '1px solid #f5c6cb';
    warning.style.borderRadius = '8px';
    warning.style.padding = '10px';
    warning.style.marginBottom = '8px';
    warning.style.display = 'flex';
    warning.style.flexDirection = 'column';
    warning.style.alignItems = 'flex-start';
    warning.style.fontFamily = 'monospace';
    warning.style.fontWeight = 'normal';

    // Warning text
    const warningText = document.createElement('p');
    warningText.style.margin = '0 0 8px 0';
    warningText.style.color = '#721c24';
    warningText.style.fontSize = '14px';
    warningText.textContent = '⚠️ This appears to be a stolen tweet!';

    // Links container
    const linksContainer = document.createElement('div');
    linksContainer.style.display = 'flex';
    linksContainer.style.gap = '10px';

    // Original tweet link
    const originalLink = document.createElement('a');
    originalLink.href = result['original_link'];
    originalLink.target = '_blank';
    originalLink.style.color = '#1976d2';
    originalLink.style.textDecoration = 'none';
    originalLink.style.fontSize = '13px';
    originalLink.style.fontFamily = 'monospace';
    originalLink.textContent = 'View original tweet';
    originalLink.onmouseover = () => originalLink.style.textDecoration = 'underline';
    originalLink.onmouseout = () => originalLink.style.textDecoration = 'none';

    // Dismiss link
    const dismissLink = document.createElement('a');
    dismissLink.style.color = '#1976d2';
    dismissLink.style.textDecoration = 'none';
    dismissLink.style.fontSize = '13px';
    dismissLink.style.fontFamily = 'monospace';
    dismissLink.textContent = 'No, it\'s not';
    dismissLink.onclick = () => handleDismiss(warning, result);
    dismissLink.onmouseover = () => dismissLink.style.textDecoration = 'underline';
    dismissLink.onmouseout = () => dismissLink.style.textDecoration = 'none';

    // Append links to the container
    linksContainer.appendChild(originalLink);
    linksContainer.appendChild(dismissLink);

    // Append elements to warning container
    warning.appendChild(warningText);
    warning.appendChild(linksContainer);

    return warning;
}

function handleDismiss(warning, result) {
    fetch(`${baseURL}/sus`, { method: 'POST', body: JSON.stringify(result) });
    warning.innerHTML = '';

    // Confirmation message
    const confirmationText = document.createElement('p');
    confirmationText.textContent = 'Your response has been recorded!';
    confirmationText.style.margin = '0';
    confirmationText.style.color = '#721c24'; // Dark red for better readability
    confirmationText.style.fontSize = '14px';
    confirmationText.style.fontFamily = 'monospace';

    warning.appendChild(confirmationText);
}

function flagTweets(results) {
    results
        .filter((result) => { return result['status'] === 'stolen' })
        .forEach(result => {
            const link = document.querySelector(`a[href="${result['stolen_link'].replace('https://x.com', '')}"]`)
            const tweet = link?.closest('.css-175oi2r[data-testid="cellInnerDiv"]')

            const isFlagged = tweet.getElementsByClassName("stolen-tweet-warning")
            if (isFlagged.length !== 0) {
                return
            }

            const warning = createWarningBanner(result)

            const beforeTweet = tweet.querySelector('div > div > article > div > div')
            const beforeTweetChild = beforeTweet.querySelector('div:nth-child(2)')

            beforeTweet.insertBefore(warning, beforeTweetChild)
        }
    )
}

async function sendDetails(detailsList) {
    const resolvedDetails = await Promise.all(detailsList.map(detail => detail instanceof Promise ? detail : Promise.resolve(detail)));

    resolvedDetails.forEach(detail => {
        if (detail !== undefined && detail.quotePost) {
            resolvedDetails.push(detail.quotePost);
            delete detail.quotePost;
        }
    })

    const details = resolvedDetails.filter((detail) => { return detail !== undefined && detail.images !== undefined && detail.images.length !== 0 });

    if (details.length === 0) { return }

    const url = `${baseURL}general/tweet/details`
    const options = {
        method: "POST",
        body: JSON.stringify(details),
        headers: { "Content-Type": "application/json" }
    }

    fetch(url, options)
        .then(response => response.json())
        .then(data => { flagTweets(data['results']) })
        .catch(error => {
            console.error("Error sending details:", error)
            return
        }
    )
}

function monitorTimeline(timeline) {
    const callback = function (mutations) {
        mutations.forEach(mutation => {
            const detailsList = [...mutation.addedNodes].map(tweet => { return getTweetDetails(tweet) })

            sendDetails(detailsList);
        })
    }

    const observer = new MutationObserver(callback)
    observer.observe(timeline, { childList: true })
}

async function initialTimelineRead(timeline) {
    const detailsList = [...timeline.childNodes].map(tweet => { return getTweetDetails(tweet) })

    await sendDetails(detailsList)
}