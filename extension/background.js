function parseTimestamp(timestamp) {
    let parts = timestamp.split(":").map(part => part.includes(".") ? parseFloat(part) : parseInt(part, 10));

    if (parts.length === 3) {
        // HH:MM:SS.mmm format
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // MM:SS.mmm format
        return parts[0] * 60 + parts[1];
    }

    return 0;
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setOptions({
        path: "sidepanel.html",
        enabled: true
    });
});

chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "open_sidepanel") {
        openSidePanelWithCheck(request, sendResponse)
    } else if (request.action === "save_json") {
        saveJSONToCache(request.filePath, request.jsonData, sendResponse);
    } else if (request.action === "edit_json") {
        editJSONInCache(request.filePath, request.newEntry, sendResponse, true);
    } else if (request.action === "check_json") {
        checkIfJSONExists(request.filePath, sendResponse);
    } else if (request.action === "cache_screenshot") {
        saveScreenshotToCache(request.filePath, request.imageData, sendResponse);
    } else if (request.action === "delete_json_entry") {
        deleteJSONEntryInCache(request.filePath, request.newEntry, sendResponse);
        deleteScreenshotInCache(request.newEntry.filename, sendResponse);
    }
    return true;
});

function openSidePanelWithCheck(request, sendResponse) {
    chrome.sidePanel.open({ tabId: request.id }).then(() => {
        console.log("Side panel opened for tab:", request.id);
        sendResponse({ status: "success" });
    }).catch(error => {
        console.error("Failed to open side panel:", error);
        sendResponse({ status: "error", message: error.message });
    });
}

function saveScreenshotToCache(filePath, imageData, sendResponse) {
    let cacheData = {};
    cacheData[filePath] = imageData; // Store Base64 image

    chrome.storage.local.set(cacheData, function () {
        if (chrome.runtime.lastError) {
            console.error("Error saving image:", chrome.runtime.lastError.message);
            sendResponse({ status: "Error saving image" });
        } else {
            console.log("Screenshot saved in local storage:", filePath);
            sendResponse({ status: "Image saved" });
        }
    });
}

function saveJSONToCache(filePath, jsonData, sendResponse) {
    let cacheData = {};
    cacheData[filePath] = jsonData;

    chrome.storage.local.set(cacheData, function () {
        if (chrome.runtime.lastError) {
            console.error("Error saving JSON to cache:", chrome.runtime.lastError.message);
            sendResponse({ status: "Error saving to cache" });
        } else {
            console.log("JSON saved in local storage:", filePath);
            sendResponse({ status: "JSON saved in cache" });
        }
    });
}

function editJSONInCache(filePath, updateData, sendResponse, sortEntries = false, comparator = null) {
    chrome.storage.local.get([filePath], function (result) {
        let data = result[filePath];

        if (!data) {
            console.error("JSON not found in local storage, cannot edit.");
            sendResponse({ error: "JSON file not found" });
            return;
        }

        let existingEntry = data.screenshots.find(screenshot => screenshot.timestamp === updateData.timestamp);

        if (existingEntry) {
            existingEntry.note = updateData.note;
            console.log(`Updated note for timestamp ${updateData.timestamp}`);
        } else {
            data.screenshots.push(updateData);
            console.log(`Added new entry for timestamp ${updateData.timestamp}`);
        }

        if (sortEntries) {
            if (typeof comparator === "function") {
                data.screenshots.sort(comparator);
            } else {
                // Default sorting by timestamp
                data.screenshots.sort((a, b) => {
                    let timeA = parseTimestamp(a.timestamp);
                    let timeB = parseTimestamp(b.timestamp);
                    return timeA - timeB;
                });
            }
        }
        saveJSONToCache(filePath, data, sendResponse);
    });
}

function deleteJSONEntryInCache(filePath, updateData, sendResponse) {
    chrome.storage.local.get([filePath], function (result) {
        let data = result[filePath];

        if (!data) {
            console.error("JSON not found in local storage, cannot delete.");
            sendResponse({ error: "JSON file not found" });
            return;
        }

        // Remove the entry by timestamp
        let originalLength = data.screenshots.length;
        data.screenshots = data.screenshots.filter(screenshot => screenshot.timestamp !== updateData.timestamp);

        if (data.screenshots.length === originalLength) {
            console.warn(`No matching entry found for timestamp ${updateData.timestamp}`);
        } else {
            console.log(`Deleted entry for timestamp ${updateData.timestamp}`);
        }

        // Save updated JSON back to storage
        saveJSONToCache(filePath, data, sendResponse);
    });
}

function deleteScreenshotInCache(filename, sendResponse) {
    chrome.storage.local.remove(filename, function () {
        if (chrome.runtime.lastError) {
            console.error("Error deleting screenshot:", chrome.runtime.lastError.message);
            sendResponse({ status: "error", message: chrome.runtime.lastError.message });
        } else {
            console.log(`Deleted screenshot entry: ${filename}`);
            sendResponse({ status: "success", message: `Deleted ${filename}` });
        }
    });
}

function checkIfJSONExists(filePath, sendResponse) {
    chrome.storage.local.get([filePath], function (result) {
        sendResponse({ exists: Boolean(result[filePath]) });
    });
}
