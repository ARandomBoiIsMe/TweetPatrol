chrome.tabs.onUpdated.addListener((_, changeInfo, tab) => {
    if (tab.active && changeInfo.status === 'complete') {
        handleTabUrl(tab)
    }
})

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        handleTabUrl(tab)
    })
})

async function handleTabUrl(tab) {
    if (tab.url.startsWith('https://x.com')) {
        let scriptPath = await determineScriptPath(tab)
        if (scriptPath) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['utils.js', `scripts/${scriptPath}`]
            })
        }
    }
}

async function determineScriptPath(tab) {
    if (tab.url.includes('/home')) return 'home.js'
    if (tab.url.includes('/status')) return 'poast.js'
    if (tab.url.includes('/search')) return 'search.js'

    const isProfilePage = await waitForTitleMatch(tab, ' (@')
    if (isProfilePage) return 'profile.js'

    return null
}

async function waitForTitleMatch(tab, titleSubstring, maxAttempts = 10, interval = 200) {
    let attempts = 0

    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, interval))
        const updatedTab = await chrome.tabs.get(tab.id)

        if (updatedTab.title.includes(titleSubstring)) return true

        attempts++
    }

    return false
}