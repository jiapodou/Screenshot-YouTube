document.addEventListener("DOMContentLoaded", function () {
    renderSidePanel();
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        renderSidePanel();
    }
});


function updateSidePanelUI() {
    // Re-fetch the JSON data and update your DOM elements accordingly
    chrome.storage.local.get(null, function (data) {
        let container = document.getElementById("screenshotContainer");
        container.innerHTML = ""; // Clear existing items

        // Filter data for the current video (if applicable)
        let currentVideoID = getCurrentYoutubeVideoIDFromSidePanel(); // Implement as needed
        Object.keys(data).forEach(filePath => {
            if (data[filePath] && data[filePath].video_id === currentVideoID) {
                let videoData = data[filePath];
                videoData.screenshots.forEach(screenshot => {
                    createScreenshotItem(container, filePath, screenshot);
                });
            }
        });
    });
}

function temp() {
    chrome.storage.local.get(null, function (data) {
        console.log("All stored data:", data);
    });
}

function editEntryInJSON(jsonPath, updateData) {
    chrome.runtime.sendMessage({
        action: "edit_json",
        filePath: jsonPath,
        newEntry: updateData
    });
}

function deleteEntryInJSON(jsonPath, updateData) {
    chrome.runtime.sendMessage({
        action: "delete_json_entry",
        filePath: jsonPath,
        newEntry: updateData
    });
}

function getCurrentYoutubeVideoID(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs.length === 0) {
            console.error("No active tab found.");
            callback(null);
            return;
        }

        let url = new URL(tabs[0].url);
        let videoID = url.searchParams.get("v") || null; // Extract YouTube Video ID
        callback(videoID);
    });
}

function renderSidePanel() {
    getCurrentYoutubeVideoID(function (currentVideoID) {
        if (!currentVideoID) {
            console.error("Could not determine current YouTube video ID.");
            return;
        }
        chrome.storage.local.get(null, function (data) {
            let container = document.getElementById("screenshotContainer");
            container.innerHTML = ""; // Clear existing items

            // Loop through all stored items
            Object.keys(data).forEach(filePath => {
                let videoData = data[filePath];
                // Check if this JSON entry is for the current video
                if (videoData && videoData.video_id === currentVideoID) {
                    videoData.screenshots.forEach(screenshot => {
                        createScreenshotItem(container, filePath, screenshot);
                    });
                }
            });
        });
    });
}

// Function to create a screenshot UI item
function createScreenshotItem(container, filePath, screenshot) {
    let item = document.createElement("div");
    item.className = "screenshot-item";
    let jsonPath = filePath

    let img = document.createElement("img");
    chrome.storage.local.get(screenshot.filename, function (result) {
        img.src = result[screenshot.filename];
    });

    let details = document.createElement("div");
    details.className = "screenshot-details";

    let timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.innerText = `+ ${screenshot.timestamp}`;

    let note = document.createElement("div");
    note.className = "screenshot-note";
    note.innerText = screenshot.note || "No note added.";

    let actions = document.createElement("div");
    actions.className = "actions";

    let editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.innerText = "Edit Note";
    editBtn.addEventListener("click", function () {
        editNote(jsonPath, screenshot);
    });

    let deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerText = "Delete";
    deleteBtn.addEventListener("click", function () {
        deleteScreenshot(jsonPath, screenshot.filename, item);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    details.appendChild(timestamp);
    details.appendChild(note);
    details.appendChild(actions);

    item.appendChild(img);
    item.appendChild(details);
    container.appendChild(item);
}

// Function to edit a note
function editNote(jsonPath, screenshot) {
    let newNote = prompt("Edit your note:", screenshot.note);
    if (newNote !== null) {
        screenshot.note = newNote;
        editEntryInJSON(
            jsonPath,
            {
                filename: screenshot.filename,
                timestamp: screenshot.timestamp,
                note: newNote
            },
        )
        location.reload();
    }
}

// Function to delete a screenshot
function deleteScreenshot(jsonPath, filename, element) {
    if (confirm("Are you sure you want to delete this screenshot?")) {
        console.log(filename)
        element.remove();
    }
}
