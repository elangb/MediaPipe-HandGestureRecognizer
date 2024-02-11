import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;
const videoHeight = "360px";
const videoWidth = "480px";

// Sebelum kita bisa menggunakan kelas HandLandmarker, kita harus menunggu
// sampai itu selesai dimuat. Model Machine Learning bisa besar dan memerlukan
// waktu sebentar untuk mendapatkan semua yang diperlukan untuk dijalankan.
const createGestureRecognizer = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );
  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: runningMode
  });
  demosSection.classList.remove("invisible");
};
createGestureRecognizer();

/********************************************************************
// Demo 1: Mendeteksi gerakan tangan pada gambar
********************************************************************/

const imageContainers = document.getElementsByClassName("detectOnClick");

for (let i = 0; i < imageContainers.length; i++) {
  imageContainers[i].children[0].addEventListener("click", handleClick);
}

async function handleClick(event) {
  if (!gestureRecognizer) {
    alert("Harap tunggu hingga gestureRecognizer selesai dimuat");
    return;
  }

  if (runningMode === "VIDEO") {
    runningMode = "IMAGE";
    await gestureRecognizer.setOptions({ runningMode: "IMAGE" });
  }
  // Hapus semua landmark sebelumnya
  const allCanvas = event.target.parentNode.getElementsByClassName("canvas");
  for (var i = allCanvas.length - 1; i >= 0; i--) {
    const n = allCanvas[i];
    n.parentNode.removeChild(n);
  }

  const results = gestureRecognizer.recognize(event.target);
  const bahasaIndonesia = {
    "None": "Tidak Ada",
    "Closed_Fist": "Tinju Tertutup",
    "Open_Palm": "Telapak Tangan Terbuka",
    "Pointing_Up": "Menunjuk Ke Atas",
    "Thumb_Down": "Ibu Jari Kebawah",
    "Thumb_Up": "Ibu Jari Keatas",
    "Victory": "Kemenangan",
    "ILoveYou": "Aku Cinta Kamu"
  };

  // Lihat hasil di konsol untuk melihat formatnya
  console.log(results);
  if (results.gestures.length > 0) {
    results.gestures.forEach(gesture => {
      gesture.forEach(category => {
        category.categoryName = bahasaIndonesia[category.categoryName] || category.categoryName;
      });
    });
    const p = event.target.parentNode.childNodes[3];
    p.setAttribute("class", "info");

    const categoryName = results.gestures[0][0].categoryName;
    const categoryScore = parseFloat(
      results.gestures[0][0].score * 100
    ).toFixed(2);
    const handedness = results.handednesses[0][0].displayName;

    gestureOutput.innerText = `Pengenalan Gerakan: ${bahasaIndonesia[categoryName] || categoryName}\n Akurasi: ${categoryScore}%\n`;
    p.style =
      "left: 0px;" +
      "top: " +
      event.target.height +
      "px; " +
      "width: " +
      (event.target.width - 10) +
      "px;";

    const canvas = document.createElement("canvas");
    canvas.setAttribute("class", "canvas");
    canvas.setAttribute("width", event.target.naturalWidth + "px");
    canvas.setAttribute("height", event.target.naturalHeight + "px");
    canvas.style =
      "left: 0px;" +
      "top: 0px;" +
      "width: " +
      event.target.width +
      "px;" +
      "height: " +
      event.target.height +
      "px;";

    event.target.parentNode.appendChild(canvas);
    const canvasCtx = canvas.getContext("2d");
    const drawingUtils = new DrawingUtils(canvasCtx);
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        GestureRecognizer.HAND_CONNECTIONS,
        {
          color: "#00FF00",
          lineWidth: 5
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#FF0000",
        lineWidth: 1
      });
    }
  }
}

/********************************************************************
// Demo 2: Terus-menerus mengambil gambar dari aliran webcam dan mendeteksinya.
********************************************************************/

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const gestureOutput = document.getElementById("gesture_output");

// Periksa apakah akses webcam didukung.
function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Jika webcam didukung, tambahkan event listener ke tombol ketika pengguna
// ingin mengaktifkannya.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() tidak didukung oleh browser Anda");
}

// Aktifkan tampilan webcam langsung dan mulai mendeteksi.
function enableCam(event) {
  if (!gestureRecognizer) {
    alert("Harap tunggu hingga gestureRecognizer selesai dimuat");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "AKTIFKAN PREDIKSI";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "NONAKTIFKAN PREDIKSI";
  }

  // Parameter getUsermedia.
  const constraints = {
    video: true
  };

  // Aktifkan aliran webcam.
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", () => {
      video.style.transform = "scaleX(-1)"; // Flip horizontal
      predictWebcam();
    });
  });
}

let lastVideoTime = 1;
let results = undefined;
async function predictWebcam() {
  const webcamElement = document.getElementById("webcam");
  // Sekarang mari kita mulai mendeteksi aliran.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
  }
  let nowInMs = Date.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    results = gestureRecognizer.recognizeForVideo(video, nowInMs);
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  const drawingUtils = new DrawingUtils(canvasCtx);

  canvasElement.style.height = videoHeight;
  webcamElement.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  webcamElement.style.width = videoWidth;

  if (results.landmarks) {
    for (const landmarks of results.landmarks) {
      drawingUtils.drawConnectors(
        landmarks,
        GestureRecognizer.HAND_CONNECTIONS,
        {
          color: "#00FF00",
          lineWidth: 5
        }
      );
      drawingUtils.drawLandmarks(landmarks, {
        color: "#FF0000",
        lineWidth: 2
      });
    }
  }
  canvasCtx.restore();
  const bahasaIndonesia = {
    "None": "Tidak Ada",
    "Closed_Fist": "Tinju Tertutup",
    "Open_Palm": "Hai",
    "Pointing_Up": "Saya Suka",
    "Thumb_Down": "Saya Kurang Suka",
    "Thumb_Up": "Bagus",
    "Victory": "Kemenangan",
    "ILoveYou": "Aku Cinta Kamu"
  };
  if (results.gestures.length > 0) {
    gestureOutput.style.display = "block";
    gestureOutput.style.width = videoWidth;
    const categoryName = results.gestures[0][0].categoryName;
    const categoryScore = parseFloat(
      results.gestures[0][0].score * 100
    ).toFixed(2);
    const handedness = results.handednesses[0][0].displayName;
    gestureOutput.innerText = `Pengenalan Gerakan: ${bahasaIndonesia[categoryName] || categoryName}\n Akurasi: ${categoryScore}%\n`;

  } else {
    gestureOutput.style.display = "none";
  }
  // Panggil fungsi ini lagi untuk terus memprediksi saat browser siap.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}
