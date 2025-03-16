'use strict';

const APPNAME = "MySparks";
const screenshotKey = true;
const screenshotFunctionality = 0;
const screenshotFormat = "png";
const extension = "png";
let isUIAdded = false;
let resetButtonTimeout;

// Function to capture a screenshot and save metadata
function CaptureScreenshot() {
	const player = document.getElementsByClassName("video-stream")[0];
	// player.pause();

	let title = GetVideoTitle();
	let videoID = new URL(window.location.href).searchParams.get("v") || "unknownID";
	let safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_");

	let time = player.currentTime;
	let minutes = Math.floor(time / 60);
	time = Math.floor(time - (minutes * 60));
	let timestamp = `${minutes}:${time}`;

	const videoFolder = `${APPNAME}/Video_Screenshots/${safeTitle}_${videoID}/`;
	const screenshotFolder = `${videoFolder}images/`;
	const filename = `screenshot_${minutes}-${time}.${extension}`;
	const jsonPath = `${videoFolder}notes.json`;

	const canvas = document.createElement("canvas");
	canvas.width = player.videoWidth;
	canvas.height = player.videoHeight;
	canvas.getContext("2d").drawImage(player, 0, 0, canvas.width, canvas.height);

	function DownloadBlob(blob) {
		let blobURL = URL.createObjectURL(blob);

		chrome.runtime.sendMessage({
			action: "download",
			url: blobURL,
			filename: screenshotFolder + filename
		}, function (response) {
			console.log("Screenshot download response:", response);
		});

		// Check if JSON exists, then modify or create
		CheckAndModifyJSON(
			jsonPath,
			{
				timestamp: timestamp,
				filename: filename,
				note: ""
			},
			title,
			videoID);
	}

	canvas.toBlob(blob => DownloadBlob(blob), "image/" + screenshotFormat);
	ShowAddNoteButton(jsonPath, timestamp, filename, videoFolder);
}

// Function to check if JSON exists, modify it or create a new one
function CheckAndModifyJSON(jsonPath, newEntry, videoTitle, videoID) {
	chrome.runtime.sendMessage({ action: "check_json", filePath: jsonPath }, function (response) {
		if (response.exists) {
			console.log(`JSON file found, modifying ${jsonPath}`);
			chrome.runtime.sendMessage({
				action: "edit_json",
				filePath: jsonPath,
				newEntry: newEntry
			});
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

// Function to show "✔ Add Note" button
function ShowAddNoteButton(jsonPath, timestamp, filename, folderPath) {
	var screenshotButton = document.getElementById("screenshotButtonUI");
	screenshotButton.innerHTML = "Add Note";
	screenshotButton.style.width = "120px";

	screenshotButton.onclick = function () {
		ShowTextBox(jsonPath, timestamp, filename, folderPath);
	};

	clearTimeout(resetButtonTimeout);
	resetButtonTimeout = setTimeout(() => {
		ResetToCameraButton();
	}, 2000);
}

// Function to show text box for adding notes
function ShowTextBox(jsonPath, timestamp, filename, folderPath) {
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
		SaveNoteToJSON(jsonPath, timestamp, filename, folderPath, textBox.value);
		ResetToCameraButton();
	};

	screenshotButton.appendChild(textBox);
	screenshotButton.appendChild(saveButton);
}

// Function to save the note in JSON
function SaveNoteToJSON(jsonPath, timestamp, filename, folderPath, note) {
	chrome.runtime.sendMessage({
		action: "edit_json",
		filePath: jsonPath,
		updateNote: { timestamp, filename, note }
	});
}

// Function to reset the button to the camera icon
function ResetToCameraButton() {
	var screenshotButton = document.getElementById("screenshotButtonUI");
	screenshotButton.innerHTML = "📷";
	screenshotButton.style.width = "50px";
	screenshotButton.onclick = CaptureScreenshot;
}

// Function to add floating UI
function AddFloatingUI() {
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

	// PNG Image as Background with 50% size and 80% opacity
	screenshotButton.style.backgroundImage = "url('" + chrome.runtime.getURL("icons/camera.png") + "')";
	screenshotButton.style.backgroundSize = "50%"; // Set to 50% size
	screenshotButton.style.backgroundRepeat = "no-repeat";
	screenshotButton.style.backgroundPosition = "center";
	screenshotButton.style.opacity = "0.8"; // Set transparency to 0.8

	screenshotButton.onclick = CaptureScreenshot;

	playerContainer.appendChild(screenshotButton);
}

// Function to get video title
function GetVideoTitle() {
	let headerEls = document.querySelectorAll("h1.title.ytd-video-primary-info-renderer");
	return headerEls.length > 0 ? headerEls[0].innerText.trim() : "Untitled";
}

// Add event listener for 'x' key to trigger screenshot
document.addEventListener("keydown", function (e) {
	if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA" && screenshotKey && e.key === "x") {
		CaptureScreenshot();
		e.preventDefault();
	}
});

// Add floating UI when the page loads
setTimeout(AddFloatingUI, 1000);