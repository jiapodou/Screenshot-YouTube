chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "download") {
        HandleDownload(request, sendResponse);
    } else if (request.action === "save_json") {
        SaveJSONToCacheAndFile(request.filePath, request.jsonData, sendResponse);
    } else if (request.action === "edit_json") {
        EditJSONInCacheAndFile(request.filePath, request.newEntry || request.updateNote, sendResponse);
    } else if (request.action === "check_json") {
        CheckIfJSONExists(request.filePath, sendResponse);
    }
    return true;
});

// Handles downloading images
function HandleDownload(request, sendResponse) {
    console.log("Downloading file:", request.filename);

    chrome.downloads.download({
        url: request.url,
        filename: request.filename,
        saveAs: false
    }, function (downloadId) {
        sendResponse({ status: downloadId ? "Download triggered" : "Error downloading" });
    });
}

// **Updated function to save JSON using Data URI**
function SaveJSONToCacheAndFile(filePath, jsonData, sendResponse) {
    let jsonString = JSON.stringify(jsonData, null, 2);
    let blob = new Blob([jsonString], { type: "application/json" });

    let reader = new FileReader();
    reader.onloadend = function () {
        let jsonDataUri = reader.result; // Data URI
        chrome.downloads.download({
            url: jsonDataUri,
            filename: filePath,
            saveAs: false
        }, function () {
            // Cache JSON in chrome.storage.local
            let cacheData = {};
            cacheData[filePath] = jsonData;
            chrome.storage.local.set(cacheData, function () {
                console.log("JSON cached in local storage:", filePath);
            });

            sendResponse({ status: "JSON saved" });
        });
    };

    reader.readAsDataURL(blob); // Convert Blob to Data URL
}

// Edits JSON in cache and then saves it
function EditJSONInCacheAndFile(filePath, updateData, sendResponse) {
    chrome.storage.local.get([filePath], function (result) {
        let data = result[filePath];

        if (!data) {
            console.error("JSON not found in local storage, cannot edit.");
            sendResponse({ error: "JSON file not found" });
            return;
        }

        if (updateData.timestamp) {
            // Add new screenshot entry
            data.screenshots.push(updateData);
        } else if (updateData.note) {
            // Update existing note
            for (let screenshot of data.screenshots) {
                if (screenshot.timestamp === updateData.timestamp) {
                    screenshot.note = updateData.note;
                    break;
                }
            }
        }

        SaveJSONToCacheAndFile(filePath, data, sendResponse);
    });
}

// Checks if JSON file exists in cache
function CheckIfJSONExists(filePath, sendResponse) {
    chrome.storage.local.get([filePath], function (result) {
        sendResponse({ exists: Boolean(result[filePath]) });
    });
}
