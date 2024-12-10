// ====================================
// https://stackoverflow.com/a/42377997
chrome.runtime.onMessage.addListener(function (msg, _, sendResponse) {
    if (msg.text === 'are_you_there_content_script?') {
        sendResponse({ status: "yes" });
    }
});
// ====================================

if (typeof CONFIG === "undefined") {
    var CONFIG = {
        baseURL: "https://tweetpatrol.cloud/",
        maxTimelineLoadAttempts: 50,
        timelineLoadInterval: 200,
        timelinePopulationWaitTime: 500,
        imageLoadTimeout: 5000
    };
}

async function isExtensionEnabled() {
    const { extension } = await chrome.storage.local.get(["extension"]);

    if (extension === undefined || extension === 'off') return false
    else return true
}

async function showPopups() {
    const { popups } = await chrome.storage.local.get(["popups"]);

    if (popups === undefined || popups === 'off') return false
    else return true
}

async function isUserACreator() {
    const profile = document.querySelector('a[aria-label="Profile"]');
    if (!profile) return false;

    const user = profile.href.replace('https://x.com/', '');
    const url = `${CONFIG.baseURL}creator/check/${user}`;

    const { Current_X_User } = await chrome.storage.local.get(["Current_X_User"]);
    if (Current_X_User !== undefined && Current_X_User === user) {
        console.log("User is an active creator")
        return true
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.exists) {
            await chrome.storage.local.set({ Current_X_User: user });
            console.log(`Current creator is set: ${user}`);
            return true;
        }

        console.log("Current user is not a creator");
        return false;
    } catch (error) {
        console.error("Error checking user:", error);
        return false;
    }
}

async function loadTimeline(timelineLabel) {
    let timeline = null;
    let attempts = 0;

    while (!timeline && attempts < CONFIG.maxTimelineLoadAttempts) {
        timeline = document.querySelector(`[aria-label="${timelineLabel}"] > div`);
        attempts++;
        await new Promise(r => setTimeout(r, CONFIG.timelineLoadInterval));
    }

    if (!timeline) {
        throw new Error(`Timeline not found - ${timelineLabel}`);
    }

    for (let postAttempts = 0; postAttempts < CONFIG.maxTimelineLoadAttempts; postAttempts++) {
        const post = timeline.querySelector('[data-testid="cellInnerDiv"]');

        if (post) {
            await new Promise(r => setTimeout(r, CONFIG.timelinePopulationWaitTime));
            timeline = document.querySelector(`[aria-label="${timelineLabel}"] > div`);
            return timeline;
        }

        const progressbar = timeline.querySelector('[role="progressbar"]');
        if (progressbar) {
            await new Promise(r => setTimeout(r, CONFIG.timelineLoadInterval));
            timeline = document.querySelector(`[aria-label="${timelineLabel}"] > div`);
            continue;
        }

        await new Promise(r => setTimeout(r, CONFIG.timelineLoadInterval));
    }

    throw new Error(`No posts found in timeline - ${timelineLabel}`);
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
            }, CONFIG.imageLoadTimeout);
        } else {
            images.forEach(image => tweetImages.push(image.src));
            resolve(tweetImages);
        }
    });
}

async function getQuotePostDetails(quotePost) {
    const posterTagElement = quotePost.querySelector('div[data-testid="User-Name"] > div:nth-child(2) > div > div > div > div> span');
    if (!posterTagElement) return null;

    const tweetTextElement = quotePost.querySelector('div[data-testid="tweetText"] > span');

    const tweetLinkElement = quotePost.querySelector('a[role="link"]');
    if (!tweetLinkElement) return null;

    const tweetTimeElement = quotePost.querySelector('time');
    if (!tweetTimeElement) return null;

    return {
        poster: posterTagElement.textContent.replace("@", "https://x.com/"),
        text: tweetTextElement?.textContent,
        link: tweetLinkElement.href.replace(/\/photo\/\d+/g, ''),
        time: tweetTimeElement.getAttribute('datetime'),
        images: await getTweetImages(quotePost)
    };
}

async function getTweetDetails(tweet) {
    const posterTagElement = tweet.querySelector('div[data-testid="User-Name"] > div:nth-child(2) > div > div > a');
    if (!posterTagElement) return null;

    const tweetTextElement = tweet.querySelector('div[data-testid="tweetText"] > span');

    const tweetLinkElement = tweet.querySelector('div[data-testid="User-Name"] > div:nth-child(2) > div > div:nth-child(3) > a');
    if (!tweetLinkElement) return null;

    const tweetTimeElement = tweetLinkElement.querySelector('time');
    if (!tweetTimeElement) return null;

    let tweetImages = await getTweetImages(tweet);
    let quotePost = null;

    const quotePostElement = tweet.querySelector("div[aria-labelledby] > div[id]");
    if (quotePostElement) {
        quotePost = await getQuotePostDetails(quotePostElement);
        if (quotePost?.images) {
            tweetImages = tweetImages.filter(tweetImage => !quotePost.images.includes(tweetImage));
        }
    }

    return {
        poster: posterTagElement.href,
        text: tweetTextElement?.textContent,
        link: tweetLinkElement.href,
        time: tweetTimeElement.getAttribute('datetime'),
        images: tweetImages,
        quotePost
    };
}

function createWarningBanner(result) {
    const warning = document.createElement('div');
    warning.className = 'stolen-tweet-warning';
    Object.assign(warning.style, {
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        padding: '10px',
        marginBottom: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontWeight: 'normal'
    });

    const warningText = document.createElement('p');
    Object.assign(warningText.style, {
        margin: '0 0 8px 0',
        color: '#721c24',
        fontSize: '14px'
    });
    warningText.textContent = '⚠️ This appears to be a stolen tweet!';

    const linksContainer = document.createElement('div');
    linksContainer.style.display = 'flex';
    linksContainer.style.gap = '10px';

    const originalLink = createLink(result.original_link, 'View original tweet');
    // const dismissLink = createLink('#', 'No, it\'s not', () => handleDismiss(warning, result));

    linksContainer.append(originalLink);
    warning.append(warningText, linksContainer);

    return warning;
}

function createLink(href, text, onClick = null) {
    const link = document.createElement('a');
    Object.assign(link.style, {
        color: '#1976d2',
        textDecoration: 'none',
        fontSize: '13px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    link.href = href;
    link.textContent = text;
    link.target = '_blank';

    if (onClick) { link.onclick = onClick }

    link.onmouseover = () => link.style.textDecoration = 'underline';
    link.onmouseout = () => link.style.textDecoration = 'none';

    return link;
}

function handleDismiss(warning, result) {
    fetch(`${CONFIG.baseURL}sus`, {
        method: 'POST',
        body: JSON.stringify(result)
    });

    warning.innerHTML = '';
    const confirmationText = document.createElement('p');
    Object.assign(confirmationText.style, {
        margin: '0',
        color: '#721c24',
        fontSize: '14px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
    confirmationText.textContent = 'Your response has been recorded!';
    warning.appendChild(confirmationText);
}

function createAddTweetElement(data) {
    const addTweetContainer = document.createElement('div');
    const addTweet = document.createElement('button');

    addTweet.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1da1f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-plus">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 5l0 14" />
    <path d="M5 12l14 0" />
    </svg>`;
    addTweet.title = 'Add tweet to image library';

    Object.assign(addTweet.style, {
        cursor: 'pointer',
        display: 'inline-block',
        textAlign: 'center',
        fontSize: '16px',
        color: '#1da1f2',
        padding: '5px',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    addTweet.classList.add('add-tweet');

    addTweet.addEventListener('click', async () => {
        try {
            const response = await fetch(`${CONFIG.baseURL}creator/content/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                addTweet.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1da1f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-check">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M5 12l5 5l10 -10" />
                </svg>`;
                addTweet.title = 'Added successfully';
                addTweet.style.color = '#155724';

                return;
            } else {
                console.error('Request failed', await response.text());
                addTweet.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5222d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-x">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M18 6l-12 12" />
                <path d="M6 6l12 12" />
                </svg>`;
                addTweet.title = 'Failed to add';
                addTweet.style.color = '#721c24';
            }
        } catch (error) {
            console.error('An error occurred:', error);
            addTweet.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-exclamation-mark">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M12 19v.01" />
            <path d="M12 15v-10" />
            </svg>`;
            addTweet.title = 'Something went wrong';
            addTweet.style.color = '#856404';
        }

        await new Promise((r) => setTimeout(r, 5000));

        addTweet.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1da1f2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-plus">
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <path d="M12 5l0 14" />
        <path d="M5 12l14 0" />
        </svg>`;
        addTweet.title = 'Add tweet to image library';
        addTweet.style.color = '#1da1f2';
    });

    addTweetContainer.append(addTweet)

    return addTweetContainer;
}

async function processTweetDetails(detailsList) {
    const resolvedDetails = await Promise.all(
        detailsList.map(detail => detail instanceof Promise ? detail : Promise.resolve(detail))
    );

    resolvedDetails.forEach(detail => {
        if (detail !== undefined && detail !== null && detail.quotePost) {
            resolvedDetails.push(detail.quotePost);
            delete detail.quotePost;
        }
    })

    const details = resolvedDetails.filter((detail) => {
        return detail !== undefined && detail !== null && detail.images !== undefined && detail.images.length !== 0
    });

    return details;
}

async function flagTweets(results) {
    const popupsEnabled = await showPopups()
    if (!popupsEnabled) return

    const tasks = results
        .filter(result => result.status === 'stolen')
        .map(async result => {
            const link = document.querySelector(`a[href="${result.stolen_link.replace('https://x.com', '')}"]`);
            const tweet = link?.closest('.css-175oi2r[data-testid="cellInnerDiv"]');

            if (!tweet || tweet.querySelector('.stolen-tweet-warning')) return;

            const warning = createWarningBanner(result);
            const beforeTweet = tweet.querySelector('div > div > article > div > div');
            const beforeTweetChild = beforeTweet.querySelector('div:nth-child(2)');
            beforeTweet.insertBefore(warning, beforeTweetChild);
        });

    await Promise.all(tasks);
}

async function sendDetails(detailsList) {
    const details = await processTweetDetails(detailsList);
    if (!details.length) return;

    try {
        const response = await fetch(`${CONFIG.baseURL}general/tweet/details`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(details)
        });
        const data = await response.json();
        await flagTweets(data.results);
    } catch (error) {
        console.error("Error sending details:", error);
    }
}

async function initialTimelineRead(timeline, isCreator) {
    const detailsList = await Promise.all(
        [...timeline.childNodes].map(getTweetDetails)
    );

    await Promise.all([
        sendDetails(detailsList),
        isCreator ? embedCreatorTweets(detailsList) : Promise.resolve()
    ])
}

function monitorTimeline(timeline, isCreator) {
    const observer = new MutationObserver(mutations => {
        (async () => {
            for (const mutation of mutations) {
                const detailsList = await Promise.all(
                    [...mutation.addedNodes].map(getTweetDetails)
                );

                await Promise.all([
                    sendDetails(detailsList),
                    isCreator ? embedCreatorTweets(detailsList) : Promise.resolve()
                ])
            }
        })().catch(console.error);
    });

    observer.observe(timeline, { childList: true });
}

async function embedCreatorTweets(detailsList) {
    const details = await processTweetDetails(detailsList);
    if (!details.length) return;

    const { Current_X_User } = await chrome.storage.local.get(["Current_X_User"]);

    const tasks = details
        .filter(detail => detail.poster.replace('https://x.com/', '') === Current_X_User)
        .map(async detail => {
            const link = document.querySelector(`a[href="${detail.link.replace('https://x.com', '')}"]`);
            const tweet = link?.closest('.css-175oi2r[data-testid="cellInnerDiv"]');

            if (!tweet || tweet.querySelector('.add-tweet')) return;

            const addTweet = createAddTweetElement(detail);
            const statsElement = tweet.querySelector('div > div > article > div > div > div:nth-child(2) > div:nth-child(2) > div:nth-child(4) > div > div > div:nth-child(4)');
            statsElement.parentNode.insertBefore(addTweet, statsElement.nextSibling);
        });

    await Promise.all(tasks)
}