const video = document.getElementById("video");
const canvas = document.getElementById("detection-canvas");
const context = canvas.getContext("2d");
const cameraStage = document.getElementById("camera-stage");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const placeholderText = document.getElementById("placeholder-text");
const startButton = document.getElementById("start-camera");
const switchButton = document.getElementById("switch-camera");
const resultStatus = document.getElementById("result-status");
const resultIcon = document.getElementById("result-icon");
const resultTitle = document.getElementById("result-title");
const resultDetail = document.getElementById("result-detail");
const detectionsPanel = document.getElementById("detections");
const detectionsList = document.getElementById("detections-list");
const liveLabel = document.getElementById("live-label");

const TARGET_CLASSES = {
  person: { singular: "Persona", plural: "Personas", icon: "🧑", color: "#22c55e" },
  dog: { singular: "Perro", plural: "Perros", icon: "🐶", color: "#38bdf8" },
  cat: { singular: "Gato", plural: "Gatos", icon: "🐱", color: "#f59e0b" },
};
const MIN_SCORE = 0.55;
const DETECTION_INTERVAL = 350;

let detector = null;
let stream = null;
let facingMode = "user";
let detectionTimer = null;
let isDetecting = false;
let emptyFrames = 0;
let detectionSession = 0;

function setStatus(type, title, detail, iconClass) {
  resultStatus.className = `result-status result-status--${type}`;
  resultIcon.innerHTML = `<i class="${iconClass}" aria-hidden="true"></i>`;
  resultTitle.textContent = title;
  resultDetail.textContent = detail;
}

function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function stopStream() {
  detectionSession += 1;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  if (detectionTimer) {
    clearTimeout(detectionTimer);
    detectionTimer = null;
  }
  isDetecting = false;
}

function resizeCanvas() {
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
}

function drawDetection(prediction) {
  const target = TARGET_CLASSES[prediction.class];
  const [x, y, width, height] = prediction.bbox;
  const label = `${target.singular} ${Math.round(prediction.score * 100)}%`;

  context.strokeStyle = target.color;
  context.lineWidth = Math.max(3, canvas.width / 220);
  context.strokeRect(x, y, width, height);

  context.font = `600 ${Math.max(15, canvas.width / 34)}px Arial`;
  const textWidth = context.measureText(label).width;
  const labelHeight = Math.max(28, canvas.width / 18);
  const labelY = Math.max(labelHeight, y);
  context.fillStyle = target.color;
  context.fillRect(x, labelY - labelHeight, textWidth + 20, labelHeight);
  context.fillStyle = "#ffffff";
  context.fillText(label, x + 10, labelY - 8);
}

function renderDetections(predictions) {
  const counts = predictions.reduce((result, prediction) => {
    result[prediction.class] = (result[prediction.class] || 0) + 1;
    return result;
  }, {});

  detectionsList.replaceChildren();
  Object.entries(counts).forEach(([className, count]) => {
    const target = TARGET_CLASSES[className];
    const chip = document.createElement("span");
    chip.className = "detection-chip";
    chip.textContent = `${target.icon} ${count} ${count === 1 ? target.singular : target.plural}`;
    detectionsList.appendChild(chip);
  });
  detectionsPanel.hidden = false;

  const total = predictions.length;
  setStatus(
    "success",
    total === 1 ? "¡Detección encontrada!" : `¡${total} detecciones encontradas!`,
    "El detector está analizando la imagen en tiempo real.",
    "ri-checkbox-circle-line",
  );
}

function renderNoDetection() {
  detectionsPanel.hidden = true;
  detectionsList.replaceChildren();
  setStatus(
    "warning",
    "No detectamos nada",
    "No aparece ninguna persona, perro o gato. Ajusta la cámara, mejora la iluminación o acércate un poco.",
    "ri-error-warning-line",
  );
}

async function detectFrame(session) {
  if (session !== detectionSession) return;

  if (!detector || !stream || isDetecting || video.readyState < 2) {
    detectionTimer = setTimeout(() => detectFrame(session), DETECTION_INTERVAL);
    return;
  }

  isDetecting = true;
  try {
    resizeCanvas();
    const predictions = await detector.detect(video, 10, MIN_SCORE);
    const targets = predictions.filter((prediction) => TARGET_CLASSES[prediction.class]);
    clearCanvas();
    targets.forEach(drawDetection);

    if (targets.length > 0) {
      emptyFrames = 0;
      renderDetections(targets);
    } else {
      emptyFrames += 1;
      if (emptyFrames >= 3) renderNoDetection();
    }
  } catch (error) {
    console.error("Error durante la detección:", error);
    setStatus("error", "No pudimos analizar la imagen", "Intenta reiniciar la cámara.", "ri-close-circle-line");
  } finally {
    isDetecting = false;
    if (session === detectionSession) {
      detectionTimer = setTimeout(() => detectFrame(session), DETECTION_INTERVAL);
    }
  }
}

async function startCamera() {
  if (!detector) {
    setStatus("loading", "El modelo todavía está cargando", "Espera unos segundos y vuelve a intentarlo.", "ri-loader-4-line");
    return;
  }

  stopStream();
  clearCanvas();
  emptyFrames = 0;
  startButton.disabled = true;
  placeholderText.textContent = "Solicitando acceso a la cámara…";
  cameraPlaceholder.hidden = false;

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    video.srcObject = stream;
    await video.play();
    resizeCanvas();
    cameraStage.classList.toggle("is-mirrored", facingMode === "user");
    cameraPlaceholder.hidden = true;
    startButton.querySelector("span").textContent = "Reiniciar cámara";
    startButton.disabled = false;
    switchButton.disabled = false;
    liveLabel.textContent = "En vivo";
    setStatus("searching", "Buscando objetos…", "Coloca una persona, un perro o un gato frente a la cámara.", "ri-focus-3-line");
    detectFrame(detectionSession);
  } catch (error) {
    console.error("No se pudo iniciar la cámara:", error);
    cameraPlaceholder.hidden = false;
    placeholderText.textContent = "No pudimos acceder a la cámara";
    startButton.disabled = false;
    switchButton.disabled = true;
    liveLabel.textContent = "Sin cámara";
    setStatus(
      "error",
      "Permiso de cámara necesario",
      "Permite el acceso a la cámara desde el navegador y pulsa “Activar cámara” otra vez.",
      "ri-camera-off-line",
    );
  }
}

async function switchCamera() {
  facingMode = facingMode === "user" ? "environment" : "user";
  await startCamera();
}

async function loadDetector() {
  try {
    await tf.ready();
    detector = await cocoSsd.load({ base: "lite_mobilenet_v2" });
    liveLabel.textContent = "Listo";
    placeholderText.textContent = "Detector listo para usar";
    setStatus(
      "ready",
      "Detector preparado",
      "Pulsa “Activar cámara” para comenzar a reconocer personas, perros y gatos.",
      "ri-checkbox-circle-line",
    );
    startButton.disabled = false;
  } catch (error) {
    console.error("No se pudo cargar el detector:", error);
    liveLabel.textContent = "Error";
    placeholderText.textContent = "No se pudo cargar el detector";
    startButton.disabled = true;
    setStatus(
      "error",
      "No pudimos cargar el detector",
      "Comprueba tu conexión a Internet y vuelve a cargar la página.",
      "ri-wifi-off-line",
    );
  }
}

startButton.addEventListener("click", startCamera);
switchButton.addEventListener("click", switchCamera);
window.addEventListener("beforeunload", stopStream);
window.addEventListener("load", loadDetector);
