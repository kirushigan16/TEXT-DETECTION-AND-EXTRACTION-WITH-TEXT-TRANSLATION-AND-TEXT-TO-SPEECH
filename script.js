const imageUpload = document.getElementById("imageUpload");
const videoUpload = document.getElementById("videoUpload");
const outputText = document.getElementById("outputText");
const notification = document.getElementById("notification");
const languageSelect = document.getElementById("languageSelect");
const annotatedImages = document.getElementById("annotatedImages");
const audioPlayer = document.getElementById("audioPlayer");
const toggleAudio = document.getElementById("toggleAudio");
const audioContainer = document.getElementById("audioContainer");
let socket = null;
let selectedLang = languageSelect.value;

languageSelect.addEventListener("change", () => {
    selectedLang = languageSelect.value;
});

imageUpload.addEventListener("change", () => {
    if (imageUpload.files.length > 0) {
        notification.textContent = "📤 Uploading images... Working on text extraction...";
        let formData = new FormData();
        for (let file of imageUpload.files) {
            formData.append("file", file);
        }

        fetch("/upload_image", { method: "POST", body: formData })
            .then(res => {
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                outputText.value = data.text || "No text found.";
                annotatedImages.innerHTML = "";
                if (data.annotated_images) {
                    data.annotated_images.forEach(src => {
                        const img = document.createElement("img");
                        img.src = src;
                        annotatedImages.appendChild(img);
                    });
                }
                notification.textContent = `✅ Text extracted from ${imageUpload.files.length} image(s).`;
                // Hide audio controls when new content is loaded
                audioContainer.classList.add("hidden");
            })
            .catch(err => {
                notification.textContent = `❌ ${err.message}`;
                console.error(err);
            });
    }
});

videoUpload.addEventListener("change", () => {
    if (videoUpload.files.length > 0) {
        notification.textContent = "📤 Uploading video... Working on text extraction...";
        let formData = new FormData();
        formData.append("file", videoUpload.files[0]);

        fetch("/upload_video", { method: "POST", body: formData })
            .then(res => {
                if (!res.ok) throw new Error(`Server error: ${res.status}`);
                return res.json();
            })
            .then(data => {
                if (data.error) throw new Error(data.error);
                outputText.value = data.text || "No text found.";
                annotatedImages.innerHTML = "";
                notification.textContent = "✅ Text extracted from video.";
                audioContainer.classList.add("hidden");
            })
            .catch(err => {
                notification.textContent = `❌ ${err.message}`;
                console.error(err);
            });
    }
});

document.getElementById("startLive").addEventListener("click", () => {
    notification.textContent = "📸 Starting live OCR...";
    socket = io.connect(location.origin);
    socket.emit("start_live_ocr");
    document.getElementById("livePopup").classList.remove("hidden");
    annotatedImages.innerHTML = "";
    audioContainer.classList.add("hidden");

    socket.on("live_text", (data) => {
        document.getElementById("liveText").value = data.text;
        outputText.value = data.text;
        notification.textContent = "📡 Receiving live OCR data...";
    });

    socket.on("error", (data) => {
        notification.textContent = `❌ ${data.error}`;
        document.getElementById("livePopup").classList.add("hidden");
        socket.disconnect();
    });
});

document.getElementById("stopLive").addEventListener("click", () => {
    if (socket) {
        socket.emit("stop_live_ocr");
        socket.disconnect();
        socket = null;
    }
    document.getElementById("livePopup").classList.add("hidden");
    notification.textContent = "🛑 Live OCR stopped.";
    audioContainer.classList.add("hidden");
});

document.getElementById("exportTxt").addEventListener("click", () => {
    fetch("/export_txt")
        .then(response => {
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "extracted_text.txt";
            a.click();
            window.URL.revokeObjectURL(url);
            notification.textContent = "✅ Exported to TXT.";
            audioContainer.classList.add("hidden");
        })
        .catch(err => {
            notification.textContent = `❌ ${err.message}`;
            console.error(err);
        });
});

document.getElementById("translate").addEventListener("click", () => {
    notification.textContent = "🌍 Translating text...";
    fetch("/translate_text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: selectedLang })
    })
    .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
    })
    .then(data => {
        if (data.error) throw new Error(data.error);
        outputText.value = data.text;
        annotatedImages.innerHTML = "";
        notification.textContent = "✅ Translation complete.";
        audioContainer.classList.add("hidden");
    })
    .catch(err => {
        notification.textContent = `❌ ${err.message}`;
        console.error(err);
    });
});

document.getElementById("speak").addEventListener("click", () => {
    notification.textContent = "🔊 Converting to speech...";
    fetch("/speak_text")
        .then(response => {
            if (!response.ok) throw new Error(`Server error: ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.error) throw new Error(data.error);
            audioPlayer.src = data.audio_url;
            audioContainer.classList.remove("hidden");
            audioPlayer.play();
            toggleAudio.textContent = "⏯️ Pause";
            notification.textContent = "🎧 Playing speech audio.";
        })
        .catch(err => {
            notification.textContent = `❌ ${err.message}`;
            console.error(err);
            audioContainer.classList.add("hidden");
        });
});

toggleAudio.addEventListener("click", () => {
    if (audioPlayer.paused) {
        audioPlayer.play();
        toggleAudio.textContent = "⏯️ Pause";
    } else {
        audioPlayer.pause();
        toggleAudio.textContent = "⏯️ Play";
    }
});

// Make the popup draggable
const livePopup = document.getElementById("livePopup");
const popupHeader = document.getElementById("popupHeader");
let offsetX, offsetY;

popupHeader.addEventListener("mousedown", (e) => {
    offsetX = e.clientX - livePopup.offsetLeft;
    offsetY = e.clientY - livePopup.offsetTop;
    document.addEventListener("mousemove", movePopup);
    document.addEventListener("mouseup", () => {
        document.removeEventListener("mousemove", movePopup);
    });
});

function movePopup(e) {
    livePopup.style.left = `${e.clientX - offsetX}px`;
    livePopup.style.top = `${e.clientY - offsetY}px`;
}