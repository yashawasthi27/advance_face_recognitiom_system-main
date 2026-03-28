import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';

export const loadModels = async () => {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('Models loaded successfully');
    } catch (error) {
        console.error('Error loading models:', error);
    }
};

export const detectFace = async (video: HTMLVideoElement) => {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detection = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection;
};

export const getFaceDescriptor = async (image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement) => {
    const options = new faceapi.TinyFaceDetectorOptions();
    const detection = await faceapi
        .detectSingleFace(image, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
    return detection?.descriptor;
};

// --- Liveness / Anti-Spoofing ---

const calculateEAR = (eye: faceapi.Point[]) => {
    // eye has 6 points
    const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
    const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
    const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
    return (v1 + v2) / (2.0 * h);
};

export const detectBlinkEAR = (landmarks: faceapi.FaceLandmarks68) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    return (leftEAR + rightEAR) / 2.0;
};

// --- Drawing Helpers ---

export const drawFaceFeedback = (canvas: HTMLCanvasElement, detections: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>> | faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const displaySize = { width: canvas.offsetWidth, height: canvas.offsetHeight };
    faceapi.matchDimensions(canvas, displaySize);
    
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
};

export const clearCanvas = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
};
