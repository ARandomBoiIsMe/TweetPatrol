const TWITTER_URL = 'https://x.com';
const SCRIPT_PATHS = {
    home: 'scripts/home.js',
    status: 'scripts/poast.js',
    search: 'scripts/search.js',
    profile: 'scripts/profile.js'
};

chrome.tabs.onUpdated.addListener((_, changeInfo, tab) => {
    if (tab.active && changeInfo.status === 'complete' && tab.url?.startsWith(TWITTER_URL)) {
        // ====================================
        // https://stackoverflow.com/a/42377997
        chrome.tabs.sendMessage(tab.id, { text: "are_you_there_content_script?" }, function (msg) {
            msg = msg || {};

            if (chrome.runtime.lastError) { }
            if (msg.status != 'yes') { handleScriptInjection(tab) }
            else { handleScriptInjectionWithoutUtils(tab) }
        });
        // ====================================
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url?.startsWith(TWITTER_URL)) {
            // ====================================
            // https://stackoverflow.com/a/42377997
            chrome.tabs.sendMessage(tab.id, { text: "are_you_there_content_script?" }, function (msg) {
                msg = msg || {};

                if (chrome.runtime.lastError) { }
                if (msg.status != 'yes') { handleScriptInjection(tab) }
                else { handleScriptInjectionWithoutUtils(tab) }
            });
            // ====================================
        }
    });
});

async function handleScriptInjection(tab) {
    try {
        const path = await determineScriptPath(tab)
        if (!path) return;

        await injectScript(tab.id, 'utils.js');
        await injectScript(tab.id, path);
    } catch (error) {
        console.error('Script injection error:', error);
    }
}

async function handleScriptInjectionWithoutUtils(tab) {
    try {
        const path = await determineScriptPath(tab)
        if (!path) return;

        await injectScript(tab.id, path);
    } catch (error) {
        console.error('Script injection error:', error);
    }
}

async function injectScript(tabId, scriptPath) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files: [scriptPath]
        });
    } catch (error) {
        console.error(`Error injecting ${scriptPath}:`, error);
    }
}

async function determineScriptPath(tab) {
    const scripts = SCRIPT_PATHS;

    if (tab.url.includes('/home')) return scripts.home;
    if (tab.url.includes('/status')) return scripts.status;
    if (tab.url.includes('/search')) return scripts.search;

    const isProfilePage = await waitForTitleMatch(tab, ' (@');
    if (isProfilePage) return scripts.profile;

    return null;
}

async function waitForTitleMatch(tab, titleSubstring, maxAttempts = 50, interval = 200) {
    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        await new Promise(resolve => setTimeout(resolve, interval));

        try {
            const updatedTab = await chrome.tabs.get(tab.id);
            if (updatedTab.title?.includes(titleSubstring)) return true;
        } catch (error) {
            console.error('Error checking tab title:', error);
            return false;
        }
    }

    return false;
}