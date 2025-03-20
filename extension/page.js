'use strict';

const APPNAME = "MySparks";
const screenshotFormat = "png";
const extension = "png";

let resetButtonTimeout;
let isUIAdded = false;

// Function to add floating UI
function addFloatingUI() {
	if (isUIAdded) return;
	isUIAdded = true;

	var playerContainer = document.querySelector(".html5-video-player");
	if (!playerContainer) return;

	var screenshotButton = document.createElement("div");
	screenshotButton.id = "screenshotButtonUI";
	screenshotButton.style.position = "absolute";
	screenshotButton.style.bottom = "60px";
	screenshotButton.style.left = "60px";
	screenshotButton.style.width = "50px";
	screenshotButton.style.height = "50px";
	screenshotButton.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
	screenshotButton.style.borderRadius = "8px";
	screenshotButton.style.cursor = "pointer";
	screenshotButton.style.display = "flex";
	screenshotButton.style.alignItems = "center";
	screenshotButton.style.justifyContent = "center";
	screenshotButton.style.zIndex = "9999";

	screenshotButton.style.backgroundImage = "url('" + chrome.runtime.getURL("icons/camera.png") + "')";
	screenshotButton.style.backgroundSize = "50%";
	screenshotButton.style.backgroundRepeat = "no-repeat";
	screenshotButton.style.backgroundPosition = "center";
	screenshotButton.style.opacity = "0.8";

	screenshotButton.onclick = captureScreenshot;

	playerContainer.appendChild(screenshotButton);
}

// Function to show "✔ Add Note" button
function showAddNoteButton(jsonPath, timestamp, filename) {
	var screenshotButton = document.getElementById("screenshotButtonUI");
	screenshotButton.innerHTML = "Add Note";
	screenshotButton.style.width = "120px";

	screenshotButton.onclick = function () {
		showTextBox(jsonPath, timestamp, filename);
	};

	clearTimeout(resetButtonTimeout);
	resetButtonTimeout = setTimeout(() => {
		resetToCameraButton();
	}, 2000);
}

// Function to show text box for adding notes
function showTextBox(jsonPath, timestamp, filename) {
	clearTimeout(resetButtonTimeout);

	var screenshotButton = document.getElementById("screenshotButtonUI");
	screenshotButton.innerHTML = "";

	var textBox = document.createElement("textarea");
	textBox.id = "noteInputBox";
	textBox.placeholder = "Enter your note...";
	textBox.style.width = "400px";
	textBox.style.height = "80px";
	textBox.style.padding = "5px";
	textBox.style.borderRadius = "5px";

	var saveButton = document.createElement("button");
	saveButton.innerText = "Save";
	saveButton.style.marginLeft = "5px";
	saveButton.onclick = function () {
		editEntryInJSON(jsonPath, { filename, timestamp, note: textBox.value });
		resetToCameraButton();
	};

	screenshotButton.appendChild(textBox);
	screenshotButton.appendChild(saveButton);
}

// Function to reset the button to the camera icon
function resetToCameraButton() {
	var screenshotButton = document.getElementById("screenshotButtonUI");
	screenshotButton.innerHTML = "📷";
	screenshotButton.style.width = "50px";
	screenshotButton.onclick = captureScreenshot;
}


function editEntryInJSON(jsonPath, updateData) {
	chrome.runtime.sendMessage({
		action: "edit_json",
		filePath: jsonPath,
		newEntry: updateData
	});
}

// Function to check if JSON exists, modify it or create a new one
function checkAndModifyJSON(jsonPath, newEntry, videoTitle, videoID) {
	chrome.runtime.sendMessage({ action: "check_json", filePath: jsonPath }, function (response) {
		if (response.exists) {
			console.log(`JSON file found, modifying ${jsonPath}`);
			editEntryInJSON(jsonPath, newEntry);
		} else {
			console.log(`JSON file not found, creating new one at ${jsonPath}`);
			let newJsonData = {
				video_title: videoTitle,
				video_id: videoID,
				screenshots: [newEntry]
			};

			chrome.runtime.sendMessage({
				action: "save_json",
				filePath: jsonPath,
				jsonData: newJsonData
			});
		}
	});
}

// Function to capture a screenshot and save metadata
function captureScreenshot() {
	const player = document.getElementsByClassName("video-stream")[0];
	// player.pause();

	let title = getVideoTitle();
	let videoID = new URL(window.location.href).searchParams.get("v") || "unknownID";
	let safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_");

	let time = player.currentTime;
	let minutes = Math.floor(time / 60);
	let seconds = Math.floor(time % 60);
	let milliseconds = Math.floor((time % 1) * 1000);

	let timestamp = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;

	const videoFolder = `${APPNAME}_${safeTitle}_${videoID}_`;
	const filename = `${videoFolder}screenshot_${minutes}-${time}.${extension}`;
	const jsonPath = `${videoFolder}notes.json`;

	const canvas = document.createElement("canvas");
	canvas.width = player.videoWidth;
	canvas.height = player.videoHeight;
	canvas.getContext("2d").drawImage(player, 0, 0, canvas.width, canvas.height);

	function downloadBlob(blob) {
		let blobURL = URL.createObjectURL(blob);

		convertBlobToBase64(blobURL, function (base64Image) {
			if (base64Image) {
				chrome.runtime.sendMessage({
					action: "cache_screenshot",
					filePath: filename,
					imageData: base64Image
				}, function (response) {
					console.log("Screenshot cached:", response);
				});
			} else {
				console.error("Screenshot not cached:", base64Image)
			}
		});
		checkAndModifyJSON(jsonPath, { filename, timestamp, note: "" }, title, videoID);
	}

	canvas.toBlob(blob => downloadBlob(blob), "image/" + screenshotFormat);
	showAddNoteButton(jsonPath, timestamp, filename);
}

function convertBlobToBase64(blobURL, callback) {
	fetch(blobURL)
		.then(res => res.blob())
		.then(blob => {
			let reader = new FileReader();
			reader.onloadend = function () {
				callback(reader.result);
			};
			reader.readAsDataURL(blob); // Convert to Base64
		})
		.catch(error => {
			console.error("Error converting Blob to Base64:", error);
			callback(null);
		});
}

// Function to get video title
function getVideoTitle() {
	let headerEls = document.querySelectorAll("h1.title.ytd-video-primary-info-renderer");
	return headerEls.length > 0 ? headerEls[0].innerText.trim() : "Untitled";
}

// Open the side panel when requested
// chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
//     if (tabs.length > 0) {
//         chrome.runtime.sendMessage({
//             action: "open_sidepanel",
//             id: tabs[0].id
//         });
//     }
// });

// Add event listener for 'x' key to trigger screenshot
document.addEventListener("keydown", function (e) {
	if (e.key === "x") {
		captureScreenshot();
		e.preventDefault();
	}
});

// Add floating UI when the page loads
setTimeout(addFloatingUI, 1000);