import { useEffect, useMemo, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const stripPresets = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#111111" },
  { name: "Cream", value: "#fff7e8" },
  { name: "Soft Pink", value: "#ffdce7" },
  { name: "Sage Green", value: "#dce8d2" },
  { name: "Sky Blue", value: "#dceeff" },
  { name: "Beige", value: "#e9dac2" },
  { name: "Dark Brown", value: "#3a251d" },
];

const filters = {
  none: { label: "None", css: "none" },
  bw: { label: "Black & White", css: "grayscale(1)" },
  sepia: { label: "Sepia", css: "sepia(.72) saturate(.92)" },
  faded: { label: "Faded", css: "contrast(.86) brightness(1.08) saturate(.72)" },
  contrast: { label: "High Contrast", css: "contrast(1.34) saturate(1.08)" },
  warm: { label: "Warm", css: "sepia(.22) saturate(1.18) brightness(1.03)" },
  cool: { label: "Cool", css: "saturate(1.05) hue-rotate(185deg) brightness(1.02)" },
  custom: { label: "Custom", css: "" },
};

const defaultCustomFilter = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  fade: 0,
  hue: 0,
};

const customFilterControls = [
  { key: "brightness", label: "Brightness", min: 60, max: 140, step: 1, unit: "%" },
  { key: "contrast", label: "Contrast", min: 60, max: 160, step: 1, unit: "%" },
  { key: "saturation", label: "Saturation", min: 0, max: 180, step: 1, unit: "%" },
  { key: "warmth", label: "Warmth", min: 0, max: 70, step: 1, unit: "%" },
  { key: "fade", label: "Fade", min: 0, max: 40, step: 1, unit: "%" },
  { key: "hue", label: "Hue", min: -180, max: 180, step: 1, unit: "deg" },
];

const borderStyles = {
  white: { label: "Thin border", className: "frame-white" },
  black: { label: "Bold border", className: "frame-black" },
  rounded: { label: "Soft rounded", className: "frame-rounded" },
  polaroid: { label: "Classic mat", className: "frame-polaroid" },
  none: { label: "None", className: "frame-none" },
};

const stripCornerStyles = {
  rounded: { label: "Rounded", className: "strip-rounded" },
  square: { label: "Square", className: "strip-square" },
};

const stripEffects = {
  none: { label: "None", className: "effect-none" },
  hearts: { label: "Hearts", className: "effect-hearts" },
  stars: { label: "Stars", className: "effect-stars" },
  sparkles: { label: "Sparkles", className: "effect-sparkles" },
  dust: { label: "Film Dust", className: "effect-dust" },
  tape: { label: "Tape", className: "effect-tape" },
};

const fontStyles = {
  sans: { label: "Space Grotesk", value: "'Space Grotesk', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  serif: { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  script: { label: "Script-style", value: "'Segoe Script', 'Brush Script MT', cursive" },
  mono: { label: "Monospace", value: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace" },
};

const maxPhotos = 4;
const maxPhotoDimension = 1280;
const screenOrder = ["landing", "camera", "editor"];
const motionDurations = {
  exit: 90,
  enter: 340,
  reducedSplashLeave: 220,
  reducedSplashRemove: 320,
  splashLeave: 620,
  splashRemove: 940,
  capturedFeedback: 460,
};
const pdfPage = {
  width: 595.28,
  height: 841.89,
  margin: 48,
  stripWidth: 144,
};

const downloadDataUrl = (filename, dataUrl) => {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
};

const createFlattenedCanvas = (sourceCanvas) => {
  const canvas = document.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare the export canvas.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceCanvas, 0, 0);
  return canvas;
};

const dataUrlToBytes = (dataUrl) => {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const dataUrlToBase64 = (dataUrl) => dataUrl.split(",")[1] || "";

const createExportFilename = (extension) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `snapbooth-${timestamp}.${extension}`;
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not prepare the file for sharing."));
    reader.readAsDataURL(blob);
  });

const resizePhotoDataUrl = async (dataUrl) => {
  const image = await loadImage(dataUrl);
  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);

  if (largestSide <= maxPhotoDimension && dataUrl.startsWith("data:image/jpeg")) {
    return dataUrl;
  }

  const scale = Math.min(1, maxPhotoDimension / largestSide);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    return dataUrl;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
};

const shareNativeFile = async ({ filename, title, dataUrl }) => {
  const savedFile = await Filesystem.writeFile({
    path: filename,
    data: dataUrlToBase64(dataUrl),
    directory: Directory.Cache,
    recursive: true,
  });

  const fileUri = savedFile.uri;
  await Share.share({
    title,
    text: "Created with SnapBooth",
    url: fileUri,
    dialogTitle: title,
  });
};

const saveNativeFile = async ({ filename, dataUrl }) => {
  await Filesystem.requestPermissions();
  const savedFile = await Filesystem.writeFile({
    path: `SnapBooth/${filename}`,
    data: dataUrlToBase64(dataUrl),
    directory: Directory.Documents,
    recursive: true,
  });

  return savedFile.uri || `Documents/SnapBooth/${filename}`;
};

const buildStripPdfBlob = (canvas) => {
  const flattenedCanvas = createFlattenedCanvas(canvas);
  const imageBytes = dataUrlToBytes(flattenedCanvas.toDataURL("image/jpeg", 0.94));
  const maxPrintableWidth = pdfPage.width - pdfPage.margin * 2;
  const maxPrintableHeight = pdfPage.height - pdfPage.margin * 2;
  const stripRatio = canvas.width / canvas.height;
  let stripWidth = Math.min(pdfPage.stripWidth, maxPrintableWidth);
  let stripHeight = stripWidth / stripRatio;

  if (stripHeight > maxPrintableHeight) {
    stripHeight = maxPrintableHeight;
    stripWidth = stripHeight * stripRatio;
  }

  const stripX = (pdfPage.width - stripWidth) / 2;
  const stripY = (pdfPage.height - stripHeight) / 2;
  const encoder = new TextEncoder();
  const parts = [];
  const offsets = [0];
  let position = 0;

  const addString = (value) => {
    const bytes = encoder.encode(value);
    parts.push(bytes);
    position += bytes.length;
  };

  const addBytes = (bytes) => {
    parts.push(bytes);
    position += bytes.length;
  };

  const addObject = (id, body) => {
    offsets[id] = position;
    addString(`${id} 0 obj\n${body}\nendobj\n`);
  };

  addString("%PDF-1.4\n");
  addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfPage.width.toFixed(2)} ${pdfPage.height.toFixed(
      2
    )}] /Resources << /XObject << /StripImage 4 0 R >> >> /Contents 5 0 R >>`
  );

  offsets[4] = position;
  addString(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`
  );
  addBytes(imageBytes);
  addString("\nendstream\nendobj\n");

  const contentStream = `q\n1 1 1 rg\n0 0 ${pdfPage.width.toFixed(2)} ${pdfPage.height.toFixed(
    2
  )} re f\n${stripWidth.toFixed(2)} 0 0 ${stripHeight.toFixed(2)} ${stripX.toFixed(2)} ${stripY.toFixed(
    2
  )} cm\n/StripImage Do\nQ`;
  addObject(5, `<< /Length ${encoder.encode(contentStream).length} >>\nstream\n${contentStream}\nendstream`);

  const xrefPosition = position;
  addString("xref\n0 6\n0000000000 65535 f \n");
  for (let id = 1; id <= 5; id += 1) {
    addString(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  addString(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`);

  return new Blob(parts, { type: "application/pdf" });
};

function App() {
  const [screen, setScreen] = useState("landing");
  const [displayScreen, setDisplayScreen] = useState(screen);
  const [transitionPhase, setTransitionPhase] = useState("idle");
  const [transitionDirection, setTransitionDirection] = useState("forward");
  const [isScrolling, setIsScrolling] = useState(false);
  const [showSplash, setShowSplash] = useState(() => !Capacitor.isNativePlatform());
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [colorDraft, setColorDraft] = useState("#FFFFFF");
  const [photos, setPhotos] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [animatedPhotoIndex, setAnimatedPhotoIndex] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [retakeIndex, setRetakeIndex] = useState(null);
  const [photosBeforeRetake, setPhotosBeforeRetake] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPdfSaving, setIsPdfSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [cameraPermissionReady, setCameraPermissionReady] = useState(false);
  const [settings, setSettings] = useState({
    stripColor: "#ffffff",
    filter: "none",
    customFilter: defaultCustomFilter,
    frames: 4,
    border: "rounded",
    stripCorners: "rounded",
    effect: "none",
    caption: "Summer 2025",
    font: "sans",
  });

  const fileInputRef = useRef(null);
  const editorFileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stripRef = useRef(null);
  const scrollTimerRef = useRef(null);
  const capturedFeedbackTimerRef = useRef(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopCamera();
      window.clearTimeout(capturedFeedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setColorDraft(settings.stripColor.toUpperCase());
  }, [settings.stripColor]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const leaveDelay = prefersReducedMotion ? motionDurations.reducedSplashLeave : motionDurations.splashLeave;
    const removeDelay = prefersReducedMotion ? motionDurations.reducedSplashRemove : motionDurations.splashRemove;

    const leaveTimer = window.setTimeout(() => setSplashLeaving(true), leaveDelay);
    const removeTimer = window.setTimeout(() => setShowSplash(false), removeDelay);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    const isCoarseMobile = window.matchMedia?.("(max-width: 839px), (pointer: coarse)").matches;
    if (!isCoarseMobile) {
      return undefined;
    }

    const handleScroll = () => {
      if (!isScrollingRef.current) {
        isScrollingRef.current = true;
        setIsScrolling(true);
      }

      window.clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
        setIsScrolling(false);
      }, 120);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchmove", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchmove", handleScroll);
      window.clearTimeout(scrollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (displayScreen === screen) {
      return undefined;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayScreen(screen);
      setTransitionPhase("idle");
      return undefined;
    }

    const currentIndex = screenOrder.indexOf(displayScreen);
    const nextIndex = screenOrder.indexOf(screen);
    setTransitionDirection(nextIndex >= currentIndex ? "forward" : "back");
    setTransitionPhase("exiting");

    const swapTimer = window.setTimeout(() => {
      setDisplayScreen(screen);
      setTransitionPhase("entering");
    }, motionDurations.exit);

    const settleTimer = window.setTimeout(() => {
      setTransitionPhase("idle");
    }, motionDurations.exit + motionDurations.enter);

    return () => {
      window.clearTimeout(swapTimer);
      window.clearTimeout(settleTimer);
    };
  }, [screen]);

  useEffect(() => {
    if (screen !== "camera" || !cameraPermissionReady) {
      stopCamera();
      return;
    }

    let active = true;
    setCameraError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is unavailable. You can still upload a photo.");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 960 },
          height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setCameraError("Camera access is unavailable. You can still upload a photo.");
      });

    return () => {
      active = false;
    };
  }, [screen, cameraPermissionReady]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const readImageFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.readAsDataURL(file);
    });

  const handleFiles = async (files, { append = false } = {}) => {
    const imageFiles = Array.from(files || [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, maxPhotos);

    if (!imageFiles.length) {
      return;
    }

    const selectedPhotos = await Promise.all(
      imageFiles.map(async (file) => resizePhotoDataUrl(await readImageFile(file)))
    );
    setPhotos((currentPhotos) => {
      const nextPhotos = append
        ? [...currentPhotos, ...selectedPhotos].slice(0, maxPhotos)
        : selectedPhotos.slice(0, maxPhotos);
      const nextFrameCount = Math.min(maxPhotos, Math.max(1, nextPhotos.length));
      setSettings((current) => ({
        ...current,
        frames: append ? Math.max(current.frames, nextFrameCount) : nextFrameCount,
      }));
      return nextPhotos;
    });
    setExportMessage("");

    if (!append) {
      setScreen("editor");
    }
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updateStripColor = (value) => {
    updateSetting("stripColor", value);
  };

  const updateColorDraft = (value) => {
    const nextValue = value.startsWith("#") ? value : `#${value}`;
    const normalizedValue = nextValue.slice(0, 7).toUpperCase();
    setColorDraft(normalizedValue);

    if (isValidHexColor(normalizedValue)) {
      updateStripColor(normalizedValue.toLowerCase());
    }
  };

  const updateRgbChannel = (channel, value) => {
    updateStripColor(
      rgbToHex({
        ...stripRgb,
        [channel]: Number(value),
      })
    );
  };

  const updateCustomFilter = (key, value) => {
    setSettings((current) => ({
      ...current,
      filter: "custom",
      customFilter: {
        ...current.customFilter,
        [key]: Number(value),
      },
    }));
  };

  const resetCustomFilter = () => {
    setSettings((current) => ({
      ...current,
      filter: "custom",
      customFilter: defaultCustomFilter,
    }));
  };

  const startNewStrip = () => {
    setPhotos([]);
    setRetakeIndex(null);
    setPhotosBeforeRetake(null);
    setExportMessage("");
    setCameraPermissionReady(false);
    setScreen("landing");
  };

  const closeCamera = () => {
    setRetakeIndex(null);
    setCameraPermissionReady(false);
    if (photosBeforeRetake?.length) {
      setPhotos(photosBeforeRetake);
      setSettings((current) => ({ ...current, frames: photosBeforeRetake.length }));
      setPhotosBeforeRetake(null);
      setScreen("editor");
      return;
    }
    setPhotos([]);
    setScreen("landing");
  };

  const capturePhoto = async () => {
    if (countdown || !videoRef.current || (photos.length >= maxPhotos && retakeIndex === null)) {
      return;
    }

    for (let value = 3; value > 0; value -= 1) {
      setCountdown(value);
      await new Promise((resolve) => setTimeout(resolve, 850));
    }

    if (!videoRef.current) {
      setCountdown(0);
      return;
    }

    const video = videoRef.current;
    const sourceWidth = video.videoWidth || 960;
    const sourceHeight = video.videoHeight || 720;
    const sourceLargestSide = Math.max(sourceWidth, sourceHeight);
    const captureScale = Math.min(1, maxPhotoDimension / sourceLargestSide);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(sourceWidth * captureScale);
    canvas.height = Math.round(sourceHeight * captureScale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCountdown(0);
      setCameraError("Could not capture the photo. Please try again.");
      return;
    }
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photo = canvas.toDataURL("image/jpeg", 0.9);
    const capturedIndex = retakeIndex ?? photos.length;
    setCountdown(0);
    setPhotos((currentPhotos) => {
      if (retakeIndex !== null) {
        return currentPhotos.map((currentPhoto, index) => (index === retakeIndex ? photo : currentPhoto));
      }
      return [...currentPhotos, photo].slice(0, maxPhotos);
    });
    setAnimatedPhotoIndex(capturedIndex);
    window.clearTimeout(capturedFeedbackTimerRef.current);
    capturedFeedbackTimerRef.current = window.setTimeout(() => {
      setAnimatedPhotoIndex(null);
    }, motionDurations.capturedFeedback);
    setRetakeIndex(null);
  };

  const retakePhoto = (index) => {
    setRetakeIndex(index);
  };

  const continueToEditor = () => {
    if (photos.length < maxPhotos) {
      return;
    }
    setSettings((current) => ({ ...current, frames: maxPhotos }));
    setRetakeIndex(null);
    setPhotosBeforeRetake(null);
    setScreen("editor");
  };

  const startCameraFlow = () => {
    setPhotos([]);
    setRetakeIndex(null);
    setPhotosBeforeRetake(null);
    setCameraPermissionReady(false);
    setSettings((current) => ({ ...current, frames: maxPhotos }));
    setScreen("camera");
  };

  const addPhotosFromEditor = (files) => {
    handleFiles(files, { append: true });
  };

  const replaceEditorWithCameraFlow = () => {
    setPhotosBeforeRetake(photos);
    setPhotos([]);
    setRetakeIndex(null);
    setExportMessage("");
    setCameraPermissionReady(false);
    setSettings((current) => ({ ...current, frames: maxPhotos }));
    setScreen("camera");
  };

  const setUploadedPhotos = (files) => {
    handleFiles(files);
  };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return undefined;
    }

    let listener;
    let isMounted = true;

    CapacitorApp.addListener("backButton", () => {
      if (isColorPickerOpen) {
        setIsColorPickerOpen(false);
        return;
      }

      if (screen === "camera") {
        closeCamera();
        return;
      }

      if (screen === "editor") {
        startNewStrip();
        return;
      }

      CapacitorApp.exitApp();
    }).then((handle) => {
      if (!isMounted) {
        handle.remove();
        return;
      }
      listener = handle;
    });

    return () => {
      isMounted = false;
      listener?.remove();
    };
  }, [isColorPickerOpen, screen, photosBeforeRetake]);

  const handleCameraRetakeLabel = () => {
    if (retakeIndex !== null) {
      return `Retake Frame ${retakeIndex + 1}`;
    }
    if (photos.length >= maxPhotos) {
      return "All Frames Filled";
    }
    return `Take Photo ${photos.length + 1}`;
  };

  const renderStripCanvas = async () => {
    const canvasScale = Math.max(2, window.devicePixelRatio || 1);
    const stripWidth = 340;
    const stripPaddingX = 18;
    const stripPaddingTop = 18;
    const stripPaddingBottom = 16;
    const frameGap = 12;
    const frameWidth = stripWidth - stripPaddingX * 2;
    const frameHeight = Math.round((frameWidth * 3) / 4);
    const caption = settings.caption.trim();
    const captionHeight = caption ? 44 : 0;
    const stripHeight =
      stripPaddingTop +
      settings.frames * frameHeight +
      (settings.frames - 1) * frameGap +
      captionHeight +
      stripPaddingBottom;

    const canvas = document.createElement("canvas");
    canvas.width = stripWidth * canvasScale;
    canvas.height = stripHeight * canvasScale;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create export canvas.");
    }

    context.scale(canvasScale, canvasScale);
    context.clearRect(0, 0, stripWidth, stripHeight);

    if (settings.stripCorners === "rounded") {
      roundedRect(context, 0, 0, stripWidth, stripHeight, 14);
      context.clip();
    }

    context.fillStyle = settings.stripColor;
    context.fillRect(0, 0, stripWidth, stripHeight);

    const loadedPhotos = await Promise.all(
      frameItems.map((frame) => loadImage(photos[frame % photos.length]))
    );

    loadedPhotos.forEach((photo, index) => {
      const frameY = stripPaddingTop + index * (frameHeight + frameGap);
      drawExportFrame(context, photo, {
        x: stripPaddingX,
        y: frameY,
        width: frameWidth,
        height: frameHeight,
        filter: currentFilter,
        frameStyle: settings.border,
        frameColor: settings.stripColor,
      });
    });

    drawStripEffect(context, settings.effect, {
      width: stripWidth,
      height: stripHeight,
      frameX: stripPaddingX,
      frameWidth,
      frameHeight,
      frameGap,
      frameCount: settings.frames,
      frameStartY: stripPaddingTop,
    });

    if (caption) {
      context.filter = "none";
      context.fillStyle = captionColor;
      context.font = `800 24px ${fontStyles[settings.font].value}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      wrapCanvasText(context, caption, stripWidth / 2, stripHeight - stripPaddingBottom - captionHeight / 2, stripWidth - 36, 28);
    }

    return canvas;
  };

  const saveStrip = async () => {
    if (!stripRef.current || isSaving) {
      return;
    }

    setIsSaving(true);
    setExportMessage("");
    try {
      const canvas = await renderStripCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      if (Capacitor.isNativePlatform()) {
        await saveNativeFile({ filename: createExportFilename("png"), dataUrl });
        setExportMessage("Saved image to Documents/SnapBooth.");
        return;
      }
      downloadDataUrl("snapbooth-strip.png", dataUrl);
      setExportMessage("Saved image.");
    } catch (error) {
      setExportMessage(error?.message || "Could not save the image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveStripPdf = async () => {
    if (!stripRef.current || isPdfSaving) {
      return;
    }

    setIsPdfSaving(true);
    setExportMessage("");
    try {
      const canvas = await renderStripCanvas();
      const pdfBlob = buildStripPdfBlob(canvas);
      const pdfDataUrl = await blobToDataUrl(pdfBlob);
      if (Capacitor.isNativePlatform()) {
        await saveNativeFile({ filename: createExportFilename("pdf"), dataUrl: pdfDataUrl });
        setExportMessage("Saved PDF to Documents/SnapBooth.");
        return;
      }
      const pdfUrl = URL.createObjectURL(pdfBlob);
      downloadDataUrl("snapbooth-strip.pdf", pdfUrl);
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
      setExportMessage("Saved PDF.");
    } catch (error) {
      setExportMessage(error?.message || "Could not save the PDF. Please try again.");
    } finally {
      setIsPdfSaving(false);
    }
  };

  const copyStrip = async () => {
    if (!stripRef.current || isCopying) {
      return;
    }

    setIsCopying(true);
    try {
      const canvas = await renderStripCanvas();
      if (Capacitor.isNativePlatform()) {
        await shareNativeFile({
          filename: "snapbooth-strip-share.png",
          title: "Share SnapBooth strip",
          dataUrl: canvas.toDataURL("image/png"),
        });
        return;
      }
      if (!navigator.clipboard || !window.ClipboardItem) {
        return;
      }
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      }
    } finally {
      setIsCopying(false);
    }
  };

  const frameItems = useMemo(() => Array.from({ length: settings.frames }, (_, index) => index), [settings.frames]);
  const photoCountLabel = `${photos.length}/${maxPhotos} photos`;
  const currentFilter = useMemo(
    () => (settings.filter === "custom" ? buildCustomFilter(settings.customFilter) : filters[settings.filter].css),
    [settings.customFilter, settings.filter]
  );
  const frameClass = borderStyles[settings.border].className;
  const stripCornerClass = stripCornerStyles[settings.stripCorners].className;
  const stripEffectClass = stripEffects[settings.effect].className;
  const captionColor = useMemo(() => getReadableColor(settings.stripColor), [settings.stripColor]);
  const stripRgb = useMemo(() => hexToRgb(settings.stripColor), [settings.stripColor]);
  const isNativeApp = Capacitor.isNativePlatform();
  const canCopyImage = isNativeApp || (Boolean(navigator.clipboard) && Boolean(window.ClipboardItem));
  const renderControlGroup = (title, children) => (
    <div className="control-group">
      <h3>{title}</h3>
      {children}
    </div>
  );
  const renderSegmentedControl = (value, options, onChange) => (
    <div className="segmented">
      {Object.entries(options).map(([key, option]) => (
        <button className={value === key ? "active" : ""} key={key} onClick={() => onChange(key)}>
          {option.label}
        </button>
      ))}
    </div>
  );

  return (
    <main className={`app-shell ${isScrolling ? "is-scrolling" : ""}`}>
      <style>{styles}</style>
      {showSplash && (
        <div className={`splash-screen ${splashLeaving ? "leaving" : ""}`} aria-label="SnapBooth loading">
          <div className="splash-logo" aria-hidden="true">
            <img src="/logo/snapbooth-logo-192.png" alt="" width="96" height="96" />
          </div>
        </div>
      )}
      {isColorPickerOpen && (
        <div className="color-dialog-backdrop" role="presentation" onClick={() => setIsColorPickerOpen(false)}>
          <section
            className="color-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Custom strip color"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="color-dialog-header">
              <div>
                <span className="eyebrow">Strip background</span>
                <h2>Custom color</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setIsColorPickerOpen(false)} aria-label="Close">
                x
              </button>
            </div>

            <div className="color-preview-card" style={{ backgroundColor: settings.stripColor }}>
              <span>{settings.stripColor.toUpperCase()}</span>
            </div>

            <label className="hex-input-row">
              <span>Hex color</span>
              <input
                type="text"
                inputMode="text"
                value={colorDraft}
                maxLength={7}
                onBlur={() => setColorDraft(settings.stripColor.toUpperCase())}
                onChange={(event) => updateColorDraft(event.target.value)}
                aria-label="Hex color value"
              />
            </label>

            <div className="rgb-sheet-grid" aria-label="RGB color controls">
              {[
                ["red", "R", stripRgb.red],
                ["green", "G", stripRgb.green],
                ["blue", "B", stripRgb.blue],
              ].map(([channel, label, value]) => (
                <label className="rgb-sheet-control" key={channel}>
                  <span>
                    <strong>{label}</strong>
                    <small>{value}</small>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={value}
                    onChange={(event) => updateRgbChannel(channel, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <div className="color-dialog-actions">
              <button className="secondary-button compact" type="button" onClick={() => setIsColorPickerOpen(false)}>
                Done
              </button>
            </div>
          </section>
        </div>
      )}

      <div className={`screen-transition shared-axis-x ${transitionPhase} ${transitionDirection}`}>
      {displayScreen === "landing" && (
        <section className="landing">
          <div className="landing-background" aria-hidden="true">
            <img
              className="background-strip background-strip-left"
              src="/backgrounds/boyfriend-photobooth.jpg"
              alt=""
              width="736"
              height="1104"
              decoding="async"
              fetchPriority="low"
            />
            <img
              className="background-strip background-strip-right"
              src="/backgrounds/photobooth-strip.jpg"
              alt=""
              width="736"
              height="1308"
              decoding="async"
              fetchPriority="low"
            />
          </div>
          <div className="brand-block">
            <span className="eyebrow">Custom photo strip studio</span>
            <h1>SnapBooth</h1>
            <p>Create your own custom photo strip in seconds.</p>
          </div>

          <div
            className={`upload-zone ${isDragging ? "dragging" : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              handleFiles(event.dataTransfer.files);
            }}
          >
            <div className="upload-icon" aria-hidden="true">
              <span className="strip-icon">
                <span />
                <span />
                <span />
              </span>
            </div>
            <h2>Start with a photo</h2>
            <p>Drop up to 4 images here, upload from your device, or take a fresh shot with your webcam.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => fileInputRef.current?.click()}>
                Upload Photos
              </button>
              <button
                className="secondary-button"
                onClick={startCameraFlow}
              >
                Take a Photo
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                setUploadedPhotos(event.target.files);
                event.target.value = "";
              }}
              hidden
            />
          </div>
        </section>
      )}

      {displayScreen === "camera" && (
        <section className="camera-screen">
          <div className="camera-card">
            <div className="camera-header">
              <div>
                <span className="eyebrow">Webcam capture</span>
                <h1>SnapBooth</h1>
                <p className="camera-progress">{photos.length}/{maxPhotos} frames captured</p>
              </div>
              <button className="icon-button" onClick={closeCamera} aria-label="Back">
                x
              </button>
            </div>

            <div className="camera-capture-grid">
              <div className="camera-main">
                <div className="camera-preview">
                  {cameraPermissionReady ? (
                    <video ref={videoRef} autoPlay playsInline muted />
                  ) : (
                    <div className="camera-permission">
                      <h2>Camera access</h2>
                      <p>
                        SnapBooth uses your camera only to take photos for your strip. Photos stay on your device
                        unless you choose to share them.
                      </p>
                      <button className="primary-button" onClick={() => setCameraPermissionReady(true)}>
                        Continue to Camera
                      </button>
                    </div>
                  )}
                  {countdown > 0 && <div className="countdown">{countdown}</div>}
                  {cameraError && <div className="camera-error">{cameraError}</div>}
                </div>
                <div className="camera-actions">
                  <button className="secondary-button" onClick={closeCamera}>
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    onClick={capturePhoto}
                    disabled={Boolean(
                      !cameraPermissionReady ||
                        cameraError ||
                        countdown ||
                        (photos.length >= maxPhotos && retakeIndex === null)
                    )}
                  >
                    {countdown ? "Get Ready" : handleCameraRetakeLabel()}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={continueToEditor}
                    disabled={photos.length < maxPhotos || retakeIndex !== null}
                  >
                    Continue
                  </button>
                </div>
              </div>

              <aside className="camera-strip-panel" aria-label="Captured photo strip">
                <div className="camera-strip-preview">
                  {Array.from({ length: maxPhotos }, (_, index) => (
                    <div
                      className={`camera-strip-slot ${photos[index] ? "filled" : ""} ${
                        retakeIndex === index ? "retaking" : ""
                      } ${animatedPhotoIndex === index ? "captured" : ""}`}
                      key={index}
                    >
                      {photos[index] ? (
                        <>
                          <div
                            className="camera-strip-image"
                            style={{ backgroundImage: `url("${photos[index]}")` }}
                            role="img"
                            aria-label={`Captured frame ${index + 1}`}
                          />
                          <button className="retake-button" onClick={() => retakePhoto(index)}>
                            {retakeIndex === index ? "Retaking" : "Retake"}
                          </button>
                        </>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>
      )}

      {displayScreen === "editor" && (
        <section className="editor">
          <div className="editor-topbar">
            <div>
              <span className="eyebrow">Live editor</span>
              <h1>SnapBooth</h1>
              <p className="photo-count">{photoCountLabel}</p>
            </div>
            <button className="secondary-button compact" onClick={startNewStrip}>
              New Photo
            </button>
          </div>

          <div className="editor-grid">
            <section className="preview-panel" aria-label="Photobooth strip preview">
              <div className="strip-stage">
                <div
                  ref={stripRef}
                  className={`photo-strip ${stripCornerClass} ${stripEffectClass}`}
                  style={{
                    backgroundColor: settings.stripColor,
                    color: captionColor,
                    "--frame-border-color": settings.stripColor,
                  }}
                >
                  {frameItems.map((frame) => (
                    <div className={`photo-frame ${frameClass}`} key={frame}>
                      <div
                        className="photo-image"
                        role="img"
                        aria-label={`Selected photo ${frame + 1}`}
                        style={{
                          backgroundImage: `url("${photos[frame % photos.length]}")`,
                          filter: currentFilter,
                        }}
                      />
                    </div>
                  ))}
                  {settings.caption.trim() && (
                    <div className="strip-caption" style={{ fontFamily: fontStyles[settings.font].value }}>
                      {settings.caption}
                    </div>
                  )}
                </div>
              </div>
              <div className="download-row">
                {photos.length < maxPhotos && (
                  <button className="secondary-button" onClick={() => editorFileInputRef.current?.click()}>
                    Add Photos
                  </button>
                )}
                <button
                  className="secondary-button"
                  onClick={replaceEditorWithCameraFlow}
                >
                  Retake Strip
                </button>
                <input
                  ref={editorFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    addPhotosFromEditor(event.target.files);
                    event.target.value = "";
                  }}
                  hidden
                />
                <button className="primary-button" onClick={saveStrip} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Image"}
                </button>
                <button className="secondary-button" onClick={saveStripPdf} disabled={isPdfSaving}>
                  {isPdfSaving ? "Saving PDF..." : "Save as PDF"}
                </button>
                <button
                  className="secondary-button"
                  onClick={copyStrip}
                  disabled={isCopying || !canCopyImage}
                >
                  {isCopying ? "Preparing..." : isNativeApp ? "Share Image" : "Copy Image"}
                </button>
              </div>
              {exportMessage && <p className="export-message">{exportMessage}</p>}
            </section>

            <aside className="controls-panel">
              {renderControlGroup(
                "Strip Background Color",
                <>
                  <button className="color-row" type="button" onClick={() => setIsColorPickerOpen(true)}>
                    <span className="color-picker">
                      <span className="color-picker-swatch" style={{ backgroundColor: settings.stripColor }} />
                      <span>Custom color</span>
                    </span>
                    <span className="color-value">{settings.stripColor.toUpperCase()}</span>
                  </button>
                  <div className="preset-grid">
                    {stripPresets.map((preset) => (
                      <button
                        className={`swatch ${settings.stripColor === preset.value ? "active" : ""}`}
                        key={preset.value}
                        onClick={() => updateSetting("stripColor", preset.value)}
                        title={preset.name}
                        aria-label={preset.name}
                      >
                        <span style={{ backgroundColor: preset.value }} />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {renderControlGroup(
                "Filter Selector",
                <>
                  {renderSegmentedControl(settings.filter, filters, (value) => updateSetting("filter", value))}
                  {settings.filter === "custom" && (
                    <div className="custom-filter-panel">
                      {customFilterControls.map((control) => (
                        <label className="range-control" key={control.key}>
                          <span>
                            <strong>{control.label}</strong>
                            <small>
                              {settings.customFilter[control.key]}
                              {control.unit}
                            </small>
                          </span>
                          <input
                            type="range"
                            min={control.min}
                            max={control.max}
                            step={control.step}
                            value={settings.customFilter[control.key]}
                            onChange={(event) => updateCustomFilter(control.key, event.target.value)}
                          />
                        </label>
                      ))}
                      <button className="subtle-button" onClick={resetCustomFilter}>
                        Reset Custom Filter
                      </button>
                    </div>
                  )}
                </>
              )}

              {renderControlGroup(
                "Number of Frames",
                <div className="split-buttons">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      className={settings.frames === count ? "selected" : ""}
                      key={count}
                      onClick={() => updateSetting("frames", count)}
                    >
                      {count} {count === 1 ? "frame" : "frames"}
                    </button>
                  ))}
                </div>
              )}

              {renderControlGroup(
                "Frame Border Style",
                renderSegmentedControl(settings.border, borderStyles, (value) => updateSetting("border", value))
              )}

              {renderControlGroup(
                "Strip Corner Style",
                renderSegmentedControl(settings.stripCorners, stripCornerStyles, (value) =>
                  updateSetting("stripCorners", value)
                )
              )}

              {renderControlGroup(
                "Strip Effects",
                renderSegmentedControl(settings.effect, stripEffects, (value) => updateSetting("effect", value))
              )}

              {renderControlGroup(
                "Caption / Label",
                <input
                  className="text-input"
                  type="text"
                  value={settings.caption}
                  placeholder="Summer 2025"
                  maxLength={42}
                  onChange={(event) => updateSetting("caption", event.target.value)}
                />
              )}

              {renderControlGroup(
                "Caption Font Style",
                renderSegmentedControl(settings.font, fontStyles, (value) => updateSetting("font", value))
              )}
            </aside>
          </div>
        </section>
      )}
      </div>
    </main>
  );
}

function getReadableColor(hexColor) {
  const hex = hexColor.replace("#", "");
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.55 ? "#171717" : "#ffffff";
}

function clampColorChannel(value) {
  return Math.max(0, Math.min(255, Number.isFinite(value) ? value : 0));
}

function hexToRgb(hexColor) {
  const hex = hexColor.replace("#", "").padEnd(6, "0").slice(0, 6);
  return {
    red: parseInt(hex.slice(0, 2), 16),
    green: parseInt(hex.slice(2, 4), 16),
    blue: parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHex({ red, green, blue }) {
  return `#${[red, green, blue]
    .map((value) => clampColorChannel(Number(value)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function isValidHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load photo for export."));
    image.src = source;
  });
}

function drawExportFrame(context, image, options) {
  const { x, y, width, height, filter, frameStyle, frameColor } = options;
  let imageX = x;
  let imageY = y;
  let imageWidth = width;
  let imageHeight = height;

  context.save();

  if (frameStyle === "rounded") {
    roundedRect(context, x, y, width, height, 16);
    context.clip();
  }

  if (frameStyle === "white" || frameStyle === "black" || frameStyle === "rounded") {
    context.lineWidth = 3;
    context.strokeStyle = frameColor;
    context.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
    imageX += 3;
    imageY += 3;
    imageWidth -= 6;
    imageHeight -= 6;
  }

  if (frameStyle === "polaroid") {
    context.fillStyle = frameColor;
    context.fillRect(x, y, width, height);
    imageX += 8;
    imageY += 8;
    imageWidth -= 16;
    imageHeight -= 28;
  }

  context.filter = filter || "none";
  drawImageCover(context, image, imageX, imageY, imageWidth, imageHeight);
  context.restore();
  context.filter = "none";
}

function drawStripEffect(context, effect, layout) {
  if (effect === "none") {
    return;
  }

  context.save();
  context.filter = "none";

  if (effect === "hearts") {
    context.fillStyle = "rgba(184, 67, 80, .56)";
    context.font = "24px Georgia, serif";
    context.fillText("♥", 16, 30);
    context.fillText("♥", layout.width - 36, 30);
    context.save();
    context.translate(layout.width - 26, layout.height - 20);
    context.rotate((-12 * Math.PI) / 180);
    context.fillText("♥", 0, 0);
    context.restore();
  }

  if (effect === "stars") {
    context.fillStyle = "rgba(20, 20, 20, .4)";
    context.font = "22px Georgia, serif";
    context.fillText("★", 16, 30);
    context.font = "18px Georgia, serif";
    context.fillText("★ ★", layout.width - 58, layout.height - 18);
  }

  if (effect === "sparkles") {
    context.fillStyle = "rgba(239, 177, 64, .72)";
    context.font = "26px Georgia, serif";
    context.fillText("✦", 14, 32);
    context.font = "20px Georgia, serif";
    context.fillText("✧  ✦", layout.width - 70, layout.height - 18);
  }

  if (effect === "dust") {
    context.fillStyle = "rgba(30, 30, 30, .16)";
    const dots = [
      [24, 38, 1.2],
      [layout.width - 42, 72, 1],
      [44, layout.height - 56, 1],
      [layout.width - 70, layout.height - 34, 1.2],
      [layout.width * 0.48, layout.height * 0.36, .8],
      [layout.width * 0.62, layout.height * 0.68, .9],
    ];
    dots.forEach(([x, y, radius]) => {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });
  }

  if (effect === "tape") {
    drawTape(context, 12, 11, -12);
    drawTape(context, layout.width - 70, layout.height - 28, -12);
  }

  context.restore();
}

function drawTape(context, x, y, degrees) {
  context.save();
  context.translate(x + 29, y + 9);
  context.rotate((degrees * Math.PI) / 180);
  context.fillStyle = "rgba(245, 226, 181, .68)";
  context.strokeStyle = "rgba(132, 106, 64, .11)";
  context.lineWidth = 1;
  context.fillRect(-29, -9, 58, 18);
  context.strokeRect(-29, -9, 58, 18);
  context.restore();
}

function drawImageCover(context, image, x, y, width, height) {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = imageRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = imageRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function roundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function wrapCanvasText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (context.measureText(testLine).width <= maxWidth || !currentLine) {
      currentLine = testLine;
      return;
    }
    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.slice(0, 2).forEach((line, index) => {
    context.fillText(line, x, startY + index * lineHeight);
  });
}

function buildCustomFilter(filter) {
  const fadeContrast = Math.max(50, filter.contrast - filter.fade);
  const fadeBrightness = filter.brightness + filter.fade * 0.3;

  return [
    `brightness(${fadeBrightness}%)`,
    `contrast(${fadeContrast}%)`,
    `saturate(${filter.saturation}%)`,
    `sepia(${filter.warmth}%)`,
    `hue-rotate(${filter.hue}deg)`,
  ].join(" ");
}

const styles = `
  @font-face {
    font-family: "Space Grotesk";
    src: url("/fonts/SpaceGrotesk-Variable.woff2") format("woff2");
    font-weight: 300 700;
    font-style: normal;
    font-display: swap;
  }

  :root {
    --color-ink: #171717;
    --color-muted: #5d6361;
    --color-subtle: #68716f;
    --color-surface: rgba(255, 255, 255, .82);
    --color-surface-solid: #ffffff;
    --color-panel: #f5f4f0;
    --color-control: #f4f3ef;
    --color-accent: #316f69;
    --color-border: rgba(22, 24, 24, .09);
    --radius-card: 20px;
    --radius-control: 12px;
    --radius-pill: 999px;
    --shadow-card: 0 20px 54px rgba(27, 45, 43, .11);
    --shadow-button: 0 10px 22px rgba(16, 20, 20, .18);
    --window-gutter: 2rem;
    --content-max: 73.75rem;
    --camera-max: 65rem;
    --landing-card-width: min(90%, 47.5rem);
    --adaptive-panel-padding: 2rem;
    --adaptive-card-padding: 1.25rem;
    --touch-target: 3rem;
    --hero-title-size: 5.25rem;
    --screen-title-size: 3rem;
    --section-title-size: 2.1rem;
    --body-copy-size: 1.12rem;
    --photo-strip-width: min(21.25rem, 82%);
    --motion-duration-short: 150ms;
    --motion-duration-medium: 240ms;
    --motion-duration-long: 340ms;
    --motion-duration-extra-long: 620ms;
    --motion-ease-standard: cubic-bezier(.2, 0, 0, 1);
    --motion-ease-emphasized: cubic-bezier(.05, .7, .1, 1);
    --motion-ease-enter: cubic-bezier(0, 0, 0, 1);
    --motion-ease-exit: cubic-bezier(.3, 0, 1, 1);
    --transition-fast: var(--motion-duration-short) var(--motion-ease-standard);
    --transition-screen: var(--motion-duration-long);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    width: 100%;
    min-height: 100%;
    overflow-x: hidden;
  }

  body {
    margin: 0;
    overflow-x: hidden;
    overflow-y: auto;
    background: #f7f5f0;
    color: var(--color-ink);
    font-family: "Space Grotesk", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
    -webkit-overflow-scrolling: touch;
    text-rendering: optimizeLegibility;
  }

  button,
  input {
    font: inherit;
  }

  button {
    border: 0;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: .58;
  }

  .app-shell {
    min-height: 100dvh;
    overflow-x: hidden;
    background:
      linear-gradient(90deg, rgba(17, 17, 17, .035) 1px, transparent 1px),
      linear-gradient(0deg, rgba(17, 17, 17, .035) 1px, transparent 1px),
      linear-gradient(135deg, #fbfaf7 0%, #eef6f4 50%, #f7f1ed 100%);
    background-size: 32px 32px, 32px 32px, auto;
  }

  .screen-transition {
    min-height: 100dvh;
    overflow-x: hidden;
    transform-origin: center top;
    backface-visibility: hidden;
    will-change: opacity, transform;
  }

  .app-shell.is-scrolling *,
  .app-shell.is-scrolling *::before,
  .app-shell.is-scrolling *::after {
    transition-duration: 0s !important;
  }

  .splash-screen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: grid;
    place-items: center;
    min-height: 100dvh;
    padding: max(24px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left));
    background:
      linear-gradient(180deg, rgba(255, 255, 255, .72), rgba(255, 255, 255, .4)),
      #f7f5f0;
    pointer-events: auto;
    animation: splash-enter var(--motion-duration-long) var(--motion-ease-emphasized) both;
    will-change: opacity, transform;
  }

  .splash-screen.leaving {
    pointer-events: none;
    animation: splash-exit var(--motion-duration-medium) var(--motion-ease-exit) both;
  }

  .splash-logo {
    display: grid;
    width: 7rem;
    aspect-ratio: 1;
    place-items: center;
    overflow: hidden;
    border-radius: 24px;
    background: transparent;
    box-shadow: 0 16px 34px rgba(16, 20, 20, .12);
    transform: translateZ(0);
  }

  .splash-logo img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .color-dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 900;
    display: grid;
    place-items: end center;
    padding: 18px;
    background: rgba(17, 20, 20, .42);
    animation: scrim-enter var(--motion-duration-short) var(--motion-ease-standard) both;
  }

  .color-dialog {
    display: grid;
    width: min(430px, 100%);
    max-height: min(82dvh, 620px);
    gap: 16px;
    overflow-y: auto;
    padding: 18px;
    border: 1px solid rgba(17, 17, 17, .1);
    border-radius: 20px;
    background: #fbfaf7;
    box-shadow: 0 22px 58px rgba(13, 18, 17, .24);
    transform-origin: center bottom;
    animation: sheet-enter var(--motion-duration-medium) var(--motion-ease-emphasized) both;
  }

  .color-dialog-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .color-dialog-header h2 {
    margin-top: 4px;
    font-size: 1.55rem;
  }

  .color-preview-card {
    display: grid;
    min-height: 112px;
    align-items: end;
    padding: 14px;
    border: 1px solid rgba(17, 17, 17, .1);
    border-radius: 16px;
    box-shadow: inset 0 0 0 6px rgba(255, 255, 255, .75);
  }

  .color-preview-card span {
    justify-self: start;
    padding: 6px 10px;
    border-radius: var(--radius-pill);
    background: rgba(255, 255, 255, .82);
    color: #171717;
    font-size: .8rem;
    font-weight: 850;
  }

  .hex-input-row {
    display: grid;
    gap: 8px;
  }

  .hex-input-row span,
  .rgb-sheet-control strong {
    color: #29302f;
    font-size: .88rem;
    font-weight: 820;
  }

  .hex-input-row input {
    min-height: var(--touch-target);
    width: 100%;
    padding: 0 14px;
    border: 1px solid rgba(17, 17, 17, .11);
    border-radius: var(--radius-control);
    background: #fff;
    color: var(--color-ink);
    font: inherit;
    font-weight: 850;
    outline: none;
    text-transform: uppercase;
  }

  .hex-input-row input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(49, 111, 105, .14);
  }

  .rgb-sheet-grid {
    display: grid;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    background: rgba(255, 255, 255, .58);
  }

  .rgb-sheet-control {
    display: grid;
    gap: 8px;
  }

  .rgb-sheet-control span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .rgb-sheet-control small {
    color: var(--color-subtle);
    font-size: .78rem;
    font-weight: 850;
  }

  .rgb-sheet-control input {
    width: 100%;
    accent-color: var(--color-accent);
  }

  .color-dialog-actions {
    display: flex;
    justify-content: flex-end;
  }

  @keyframes sheet-enter {
    from {
      opacity: 0;
      transform: translate3d(0, 28px, 0) scale(.98);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes scrim-enter {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes splash-enter {
    from {
      opacity: 0;
      transform: scale(.985);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes splash-exit {
    from {
      opacity: 1;
      transform: scale(1);
    }

    to {
      opacity: 0;
      transform: scale(1.015);
    }
  }

  .screen-transition.shared-axis-x.entering.forward {
    animation: screen-enter-forward var(--transition-screen) var(--motion-ease-emphasized) both;
  }

  .screen-transition.shared-axis-x.entering.back {
    animation: screen-enter-back var(--transition-screen) var(--motion-ease-emphasized) both;
  }

  .screen-transition.shared-axis-x.exiting.forward {
    animation: screen-exit-forward 90ms var(--motion-ease-exit) both;
  }

  .screen-transition.shared-axis-x.exiting.back {
    animation: screen-exit-back 90ms var(--motion-ease-exit) both;
  }

  .screen-transition.entering .brand-block,
  .screen-transition.entering .upload-zone,
  .screen-transition.entering .camera-card,
  .screen-transition.entering .editor-topbar,
  .screen-transition.entering .preview-panel,
  .screen-transition.entering .controls-panel {
    animation: content-enter var(--motion-duration-long) var(--motion-ease-emphasized) both;
  }

  .screen-transition.entering .upload-zone,
  .screen-transition.entering .preview-panel {
    animation-delay: 44ms;
  }

  .screen-transition.entering .controls-panel {
    animation-delay: 72ms;
  }

  .fade-through-enter {
    animation: fade-through-enter var(--motion-duration-medium) var(--motion-ease-standard) both;
  }

  @keyframes screen-enter-forward {
    from {
      opacity: 0;
      transform: translate3d(36px, 0, 0) scale(.992);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes screen-enter-back {
    from {
      opacity: 0;
      transform: translate3d(-28px, 0, 0) scale(.996);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes screen-exit-forward {
    from {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }

    to {
      opacity: 0;
      transform: translate3d(-18px, 0, 0) scale(.996);
    }
  }

  @keyframes screen-exit-back {
    from {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }

    to {
      opacity: 0;
      transform: translate3d(16px, 0, 0) scale(.998);
    }
  }

  @keyframes content-enter {
    from {
      opacity: 0;
      transform: translate3d(0, 18px, 0);
    }

    to {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes fade-through-enter {
    from {
      opacity: 0;
      transform: scale(.98);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .landing,
  .camera-screen,
  .editor {
    width: min(var(--content-max), calc(100% - var(--window-gutter)));
    margin: 0 auto;
    padding: 48px 0;
  }

  .landing {
    display: grid;
    position: relative;
    min-height: 100dvh;
    align-content: center;
    gap: 28px;
  }

  .landing::before {
    content: "";
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, .92) 0%, rgba(255, 255, 255, .72) 34%, rgba(255, 255, 255, .76) 66%, rgba(255, 255, 255, .92) 100%),
      linear-gradient(180deg, rgba(255, 255, 255, .88) 0%, rgba(255, 255, 255, .5) 46%, rgba(255, 255, 255, .9) 100%);
    z-index: 0;
  }

  .landing-background {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  .background-strip {
    position: absolute;
    width: 26.875rem;
    max-width: 32%;
    height: auto;
    opacity: .24;
    filter: grayscale(.16) saturate(.82) brightness(1.12);
    box-shadow: 0 22px 70px rgba(18, 20, 20, .16);
  }

  .background-strip-left {
    left: max(-24px, 2vw);
    top: 17vh;
    transform: rotate(-8deg);
  }

  .background-strip-right {
    right: max(-32px, 2vw);
    top: 7vh;
    transform: rotate(8deg);
  }

  .brand-block,
  .upload-zone {
    position: relative;
    z-index: 1;
  }

  .brand-block {
    text-align: center;
  }

  .eyebrow {
    display: inline-flex;
    color: var(--color-muted);
    font-size: .78rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1 {
    margin-top: 8px;
    max-width: 100%;
    font-size: var(--hero-title-size);
    line-height: .95;
    letter-spacing: 0;
    overflow-wrap: anywhere;
  }

  .brand-block p {
    margin-top: 18px;
    color: var(--color-muted);
    font-size: var(--body-copy-size);
  }

  .upload-zone {
    display: grid;
    justify-items: center;
    gap: 16px;
    width: var(--landing-card-width);
    margin: 0 auto;
    padding: var(--adaptive-panel-padding);
    text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    backdrop-filter: blur(14px);
    transition: transform var(--motion-duration-medium) var(--motion-ease-standard), border-color var(--transition-fast), box-shadow var(--motion-duration-medium) var(--motion-ease-standard);
  }

  .upload-zone.dragging {
    transform: translateY(-3px);
    border-color: var(--color-accent);
    box-shadow: 0 24px 62px rgba(49, 111, 105, .2);
  }

  .upload-icon {
    display: grid;
    width: 78px;
    height: 78px;
    place-items: center;
    border-radius: 18px;
    background: #111;
    color: #fff;
    box-shadow: 0 12px 26px rgba(16, 20, 20, .2);
  }

  .strip-icon {
    position: relative;
    display: grid;
    width: 34px;
    height: 50px;
    gap: 5px;
    padding: 6px 7px;
    border: 4px solid #fff;
    border-radius: 5px;
    transform: rotate(-5deg);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, .18);
  }

  .strip-icon::before,
  .strip-icon::after {
    content: "";
    position: absolute;
    top: 5px;
    bottom: 5px;
    width: 3px;
    background:
      linear-gradient(#fff 0 4px, transparent 4px 8px) top / 100% 8px repeat-y;
  }

  .strip-icon::before {
    left: -2px;
  }

  .strip-icon::after {
    right: -2px;
  }

  .strip-icon span {
    display: block;
    border-radius: 3px;
    background:
      radial-gradient(circle at 50% 35%, #fff 0 4px, transparent 4px),
      radial-gradient(ellipse at 50% 84%, #fff 0 8px, transparent 8px),
      rgba(255, 255, 255, .18);
  }

  .upload-zone h2 {
    font-size: var(--section-title-size);
  }

  .upload-zone p {
    max-width: 520px;
    color: var(--color-muted);
    line-height: 1.6;
  }

  .hero-actions,
  .camera-actions,
  .download-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
  }

  .primary-button,
  .secondary-button,
  .subtle-button {
    min-height: var(--touch-target);
    padding: 0 20px;
    max-width: 100%;
    border-radius: var(--radius-pill);
    font-weight: 800;
    line-height: 1.15;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast), background var(--transition-fast);
  }

  .primary-button {
    background: #101414;
    color: #fff;
    box-shadow: var(--shadow-button);
  }

  .secondary-button {
    background: rgba(255, 255, 255, .9);
    color: #151918;
    border: 1px solid var(--color-border);
  }

  .subtle-button {
    min-height: var(--touch-target);
    background: #e9ece8;
    color: #202625;
  }

  .primary-button:hover,
  .secondary-button:hover,
  .subtle-button:hover,
  .icon-button:hover {
    transform: translateY(-2px);
  }

  .primary-button:active,
  .secondary-button:active,
  .subtle-button:active,
  .icon-button:active {
    transform: scale(.98);
  }

  .primary-button:focus-visible,
  .secondary-button:focus-visible,
  .subtle-button:focus-visible,
  .icon-button:focus-visible,
  .swatch:focus-visible,
  .segmented button:focus-visible,
  .split-buttons button:focus-visible,
  .text-input:focus-visible {
    outline: 3px solid rgba(49, 111, 105, .28);
    outline-offset: 3px;
  }

  .compact {
    min-height: var(--touch-target);
  }

  .camera-screen {
    display: grid;
    min-height: 100dvh;
    place-items: center;
    width: min(var(--camera-max), calc(100% - var(--window-gutter)));
    padding: 18px 0;
  }

  .camera-card {
    width: min(980px, 100%);
    contain: layout paint style;
    padding: var(--adaptive-card-padding);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
  }

  .camera-header,
  .editor-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
  }

  .camera-header {
    margin-bottom: 14px;
  }

  .camera-header h1,
  .editor-topbar h1 {
    font-size: var(--screen-title-size);
  }

  .camera-header h1 {
    font-size: var(--screen-title-size);
  }

  .photo-count {
    margin-top: 6px;
    color: var(--color-muted);
    font-size: .9rem;
    font-weight: 800;
  }

  .camera-progress {
    margin-top: 6px;
    color: var(--color-muted);
    font-size: .95rem;
    font-weight: 800;
  }

  .icon-button {
    display: grid;
    width: var(--touch-target);
    height: var(--touch-target);
    place-items: center;
    border-radius: var(--radius-pill);
    background: #f0efec;
    color: var(--color-ink);
    font-size: 1.3rem;
    font-weight: 800;
    line-height: 1;
    transition: transform var(--transition-fast), background var(--transition-fast);
  }

  .camera-preview {
    position: relative;
    overflow: hidden;
    aspect-ratio: 16 / 10;
    max-height: min(58vh, 520px);
    border-radius: 16px;
    background: #171717;
    transform: translateZ(0);
  }

  .camera-capture-grid {
    display: grid;
    grid-template-columns: minmax(0, 760px) 132px;
    justify-content: center;
    gap: 14px;
    align-items: stretch;
  }

  .camera-main {
    display: grid;
    gap: 14px;
  }

  .camera-preview video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1);
    transition: opacity var(--motion-duration-medium) var(--motion-ease-standard);
  }

  .camera-permission {
    display: grid;
    height: 100%;
    place-content: center;
    justify-items: center;
    gap: 14px;
    padding: 24px;
    color: #fff;
    text-align: center;
    background:
      linear-gradient(135deg, rgba(49, 111, 105, .34), rgba(17, 17, 17, .14)),
      #171717;
  }

  .camera-permission h2 {
    font-size: var(--section-title-size);
  }

  .camera-permission p {
    max-width: 440px;
    color: rgba(255, 255, 255, .78);
    line-height: 1.55;
  }

  .countdown {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(13, 18, 17, .22);
    color: #fff;
    font-size: 8rem;
    font-weight: 900;
    animation: countdown-pulse var(--motion-duration-long) var(--motion-ease-emphasized) both;
  }

  @keyframes countdown-pulse {
    0% {
      opacity: 0;
      transform: scale(.82);
    }

    24% {
      opacity: 1;
      transform: scale(1);
    }

    100% {
      opacity: .88;
      transform: scale(1.06);
    }
  }

  .camera-error {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 16px;
    padding: 14px 16px;
    border-radius: 16px;
    background: rgba(255, 255, 255, .94);
    color: #8a3325;
    font-weight: 750;
    text-align: center;
  }

  .camera-actions {
    margin-top: 18px;
  }

  .camera-main .camera-actions {
    margin-top: 0;
  }

  .camera-main .primary-button,
  .camera-main .secondary-button {
    min-height: var(--touch-target);
    padding: 0 18px;
  }

  .camera-strip-panel {
    display: grid;
    min-height: 100%;
    align-content: center;
    padding: 10px;
    border: 1px solid var(--color-border);
    border-radius: 14px;
    background: rgba(255, 255, 255, .62);
  }

  .camera-strip-preview {
    display: grid;
    gap: 8px;
  }

  .camera-strip-slot {
    position: relative;
    display: grid;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    place-items: center;
    border: 2px dashed rgba(17, 17, 17, .18);
    border-radius: 8px;
    background:
      linear-gradient(135deg, rgba(17, 17, 17, .04), rgba(255, 255, 255, .55));
    color: rgba(17, 17, 17, .38);
    font-size: 1rem;
    font-weight: 900;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast), background var(--transition-fast);
  }

  .camera-strip-slot.filled {
    border-style: solid;
    border-color: rgba(17, 17, 17, .1);
    background: #fff;
  }

  .camera-strip-slot.retaking {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(49, 111, 105, .14);
  }

  .camera-strip-slot.captured {
    animation: photo-captured var(--motion-duration-long) var(--motion-ease-emphasized) both;
  }

  .camera-strip-image {
    position: absolute;
    inset: 0;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    animation: fade-through-enter var(--motion-duration-medium) var(--motion-ease-standard) both;
  }

  @keyframes photo-captured {
    0% {
      transform: scale(.96);
      box-shadow: 0 0 0 0 rgba(49, 111, 105, .24);
    }

    45% {
      transform: scale(1.03);
      box-shadow: 0 0 0 5px rgba(49, 111, 105, .18);
    }

    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(49, 111, 105, 0);
    }
  }

  .retake-button {
    position: absolute;
    right: 5px;
    bottom: 5px;
    min-height: 2rem;
    padding: 0 8px;
    border-radius: var(--radius-pill);
    background: rgba(5, 5, 5, .82);
    color: #fff;
    font-size: .68rem;
    font-weight: 850;
    transition: transform var(--transition-fast), background var(--transition-fast);
  }

  .retake-button:hover {
    transform: translateY(-1px);
    background: #050505;
  }

  .editor {
    min-height: 100dvh;
  }

  .editor-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(20rem, 26.875rem);
    gap: 24px;
    align-items: start;
  }

  .preview-panel,
  .controls-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    backdrop-filter: blur(14px);
    contain: layout paint style;
  }

  .preview-panel {
    display: grid;
    gap: 20px;
    justify-items: center;
    padding: var(--adaptive-panel-padding);
  }

  .strip-stage {
    display: grid;
    width: 100%;
    min-height: 620px;
    place-items: center;
    border-radius: 16px;
    background:
      linear-gradient(90deg, rgba(17, 17, 17, .05) 1px, transparent 1px),
      linear-gradient(0deg, rgba(17, 17, 17, .05) 1px, transparent 1px),
      #faf9f6;
    background-size: 28px 28px;
    padding: 22px;
  }

  .photo-strip {
    position: relative;
    overflow: hidden;
    width: var(--photo-strip-width);
    padding: 18px 18px 16px;
    box-shadow: 0 24px 54px rgba(15, 19, 18, .24);
    contain: layout paint style;
    transition: background-color var(--motion-duration-medium) var(--motion-ease-standard), color var(--transition-fast), border-radius var(--motion-duration-medium) var(--motion-ease-standard), box-shadow var(--motion-duration-medium) var(--motion-ease-standard);
  }

  .photo-strip::before,
  .photo-strip::after {
    position: absolute;
    z-index: 2;
    pointer-events: none;
  }

  .effect-none::before,
  .effect-none::after {
    content: none;
  }

  .effect-hearts::before {
    content: "♥  ♥";
    left: 16px;
    right: 16px;
    top: 9px;
    display: flex;
    justify-content: space-between;
    color: rgba(184, 67, 80, .56);
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.15rem;
    line-height: 1;
  }

  .effect-hearts::after {
    content: "♥";
    right: 18px;
    bottom: 9px;
    color: rgba(184, 67, 80, .5);
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.05rem;
    line-height: 1;
    transform: rotate(-12deg);
  }

  .effect-stars::before {
    content: "★";
    left: 16px;
    top: 10px;
    color: rgba(20, 20, 20, .42);
    font-size: 1rem;
    line-height: 1;
  }

  .effect-stars::after {
    content: "★ ★";
    right: 14px;
    bottom: 10px;
    color: rgba(20, 20, 20, .36);
    font-size: .9rem;
    line-height: 1;
  }

  .effect-sparkles::before {
    content: "✦";
    left: 14px;
    top: 11px;
    color: rgba(239, 177, 64, .72);
    font-size: 1.25rem;
    line-height: 1;
  }

  .effect-sparkles::after {
    content: "✧  ✦";
    right: 12px;
    bottom: 11px;
    color: rgba(239, 177, 64, .64);
    font-size: .95rem;
    line-height: 1;
  }

  .effect-dust {
    background-image:
      radial-gradient(circle at 12% 18%, rgba(35, 35, 35, .16) 0 1px, transparent 1px),
      radial-gradient(circle at 78% 34%, rgba(35, 35, 35, .12) 0 1px, transparent 1px),
      radial-gradient(circle at 42% 72%, rgba(255, 255, 255, .34) 0 1px, transparent 1px),
      radial-gradient(circle at 88% 82%, rgba(35, 35, 35, .1) 0 1px, transparent 1px);
    background-size: 31px 37px, 43px 47px, 29px 41px, 53px 59px;
  }

  .effect-tape::before,
  .effect-tape::after {
    content: "";
    width: 58px;
    height: 18px;
    border-radius: 2px;
    background: rgba(245, 226, 181, .68);
    box-shadow: inset 0 0 0 1px rgba(132, 106, 64, .11);
  }

  .effect-tape::before {
    left: 10px;
    top: 10px;
    transform: rotate(-12deg);
  }

  .effect-tape::after {
    right: 10px;
    bottom: 10px;
    transform: rotate(-12deg);
  }

  .strip-rounded {
    border-radius: 14px;
  }

  .strip-square {
    border-radius: 0;
  }

  .photo-frame {
    position: relative;
    overflow: hidden;
    aspect-ratio: 4 / 3;
    margin-bottom: 12px;
    background: rgba(255, 255, 255, .72);
  }

  .photo-image {
    width: 100%;
    height: 100%;
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    backface-visibility: hidden;
    transition: filter var(--motion-duration-medium) var(--motion-ease-standard), transform var(--motion-duration-medium) var(--motion-ease-standard);
  }

  .frame-white {
    border: 3px solid var(--frame-border-color);
  }

  .frame-black {
    border: 3px solid var(--frame-border-color);
  }

  .frame-rounded {
    border: 3px solid var(--frame-border-color);
    border-radius: 16px;
    transition: border-color var(--transition-fast), border-radius var(--motion-duration-medium) var(--motion-ease-standard);
  }

  .frame-polaroid {
    padding: 8px 8px 20px;
    border-radius: 10px;
    background: var(--frame-border-color);
  }

  .frame-none {
    border: 0;
  }

  .strip-caption {
    overflow-wrap: anywhere;
    padding: 4px 4px 0;
    text-align: center;
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1.24;
  }

  .export-message {
    color: var(--color-muted);
    font-size: .88rem;
    font-weight: 800;
    text-align: center;
  }

  .controls-panel {
    display: grid;
    gap: 18px;
    padding: 22px;
  }

  .control-group {
    display: grid;
    gap: 12px;
  }

  .control-group h3 {
    color: #29302f;
    font-size: .96rem;
  }

  .color-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    min-height: 56px;
    padding: 8px 10px;
    border: 1px solid rgba(17, 17, 17, .08);
    border-radius: var(--radius-control);
    background: var(--color-control);
    color: inherit;
    text-align: left;
    transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
  }

  .color-row:hover {
    transform: translateY(-1px);
  }

  .color-row:focus-within {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(49, 111, 105, .12);
  }

  .color-picker {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    gap: 10px;
    min-width: 0;
    color: #384240;
    font-size: .9rem;
    font-weight: 800;
  }

  .color-picker-swatch {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    padding: 0;
    border: 1px solid rgba(17, 17, 17, .16);
    border-radius: 10px;
    box-shadow: inset 0 0 0 4px #fff;
    transition: background-color var(--motion-duration-medium) var(--motion-ease-standard), border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .color-picker:focus-within .color-picker-swatch {
    border-color: #151918;
    box-shadow: inset 0 0 0 4px #fff, 0 0 0 3px rgba(17, 17, 17, .12);
  }

  .color-value {
    flex: 0 0 auto;
    color: var(--color-subtle);
    font-size: .82rem;
    font-weight: 800;
  }

  .preset-grid,
  .segmented {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .swatch,
  .segmented button,
  .split-buttons button {
    min-height: var(--touch-target);
    min-width: 0;
    border-radius: var(--radius-control);
    background: var(--color-control);
    color: #242927;
    border: 1px solid rgba(17, 17, 17, .08);
    font-size: .88rem;
    font-weight: 780;
    line-height: 1.15;
    overflow-wrap: anywhere;
    transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  }

  .swatch {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 9px;
    padding: 8px 10px;
  }

  .swatch span {
    flex: 0 0 auto;
    width: 20px;
    height: 20px;
    border: 1px solid rgba(17, 17, 17, .16);
    border-radius: 50%;
  }

  .swatch:hover,
  .segmented button:hover,
  .split-buttons button:hover {
    transform: translateY(-1px);
  }

  .swatch.active,
  .segmented button.active,
  .split-buttons button.selected {
    background: #111;
    color: #fff;
    border-color: #111;
    animation: option-selected var(--motion-duration-short) var(--motion-ease-standard) both;
  }

  @keyframes option-selected {
    from {
      transform: scale(.98);
    }

    to {
      transform: scale(1);
    }
  }

  .split-buttons {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .custom-filter-panel {
    display: grid;
    gap: 14px;
    padding: 14px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-control);
    background: rgba(255, 255, 255, .5);
  }

  .range-control {
    display: grid;
    gap: 8px;
  }

  .range-control span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #29302f;
    font-size: .86rem;
  }

  .range-control small {
    color: var(--color-subtle);
    font-size: .78rem;
    font-weight: 800;
  }

  .range-control input {
    width: 100%;
    accent-color: var(--color-accent);
  }

  .text-input {
    width: 100%;
    min-height: var(--touch-target);
    padding: 0 14px;
    border: 1px solid rgba(17, 17, 17, .11);
    border-radius: var(--radius-control);
    background: var(--color-surface-solid);
    color: var(--color-ink);
    outline: none;
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .text-input:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(49, 111, 105, .14);
  }

  @media (max-width: 839px) {
    :root {
      --shadow-card: 0 12px 28px rgba(27, 45, 43, .09);
      --shadow-button: 0 6px 14px rgba(16, 20, 20, .14);
      --window-gutter: 1.25rem;
      --content-max: 47.5rem;
      --camera-max: 47.5rem;
      --landing-card-width: min(90%, 42rem);
      --adaptive-panel-padding: 1.5rem;
      --adaptive-card-padding: 1rem;
      --hero-title-size: 4.25rem;
      --screen-title-size: 2.65rem;
      --section-title-size: 1.9rem;
      --body-copy-size: 1.05rem;
      --photo-strip-width: min(21.25rem, 92%);
      --motion-duration-short: 120ms;
      --motion-duration-medium: 190ms;
      --motion-duration-long: 280ms;
      --transition-screen: var(--motion-duration-long);
    }

    .screen-transition.entering {
      animation-duration: var(--motion-duration-long);
    }

    @keyframes screen-enter-forward {
      from {
        opacity: 0;
        transform: translate3d(18px, 0, 0) scale(.994);
      }

      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @keyframes screen-enter-back {
      from {
        opacity: 0;
        transform: translate3d(-14px, 0, 0) scale(.997);
      }

      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    .landing,
    .camera-screen,
    .editor {
      width: min(var(--content-max), calc(100% - var(--window-gutter)));
      padding: max(16px, env(safe-area-inset-top)) 0 max(18px, env(safe-area-inset-bottom));
    }

    .landing::before {
      position: absolute;
      background: rgba(255, 255, 255, .84);
    }

    .landing-background {
      position: absolute;
    }

    .background-strip {
      width: 18.75rem;
      max-width: 42%;
      opacity: .16;
      filter: none;
      box-shadow: none;
    }

    .upload-zone,
    .preview-panel,
    .controls-panel {
      backdrop-filter: none;
    }

    .camera-card,
    .preview-panel,
    .controls-panel {
      box-shadow: 0 8px 18px rgba(27, 45, 43, .07);
    }

    .app-shell.is-scrolling .upload-zone,
    .app-shell.is-scrolling .camera-card,
    .app-shell.is-scrolling .preview-panel,
    .app-shell.is-scrolling .controls-panel,
    .app-shell.is-scrolling .photo-strip,
    .app-shell.is-scrolling .upload-icon,
    .app-shell.is-scrolling .primary-button {
      box-shadow: none;
    }

    .app-shell.is-scrolling .strip-stage {
      background: #faf9f6;
    }

    .camera-preview {
      aspect-ratio: 4 / 3;
      max-height: 52dvh;
    }

    .background-strip-left {
      left: -70px;
      top: 18vh;
    }

    .background-strip-right {
      right: -76px;
      top: 12vh;
    }

    .camera-capture-grid {
      grid-template-columns: 1fr;
    }

    .camera-strip-panel {
      align-content: stretch;
    }

    .camera-strip-preview {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .editor-grid {
      grid-template-columns: 1fr;
    }

    .strip-stage {
      min-height: auto;
      padding: 14px;
      background: #faf9f6;
      background-size: auto;
    }

    .photo-strip {
      box-shadow: 0 8px 18px rgba(15, 19, 18, .14);
    }

    .controls-panel,
    .preview-panel {
      border-radius: var(--radius-card);
    }
  }

  @media (min-width: 600px) and (max-width: 839px) {
    :root {
      --window-gutter: 2.5rem;
      --landing-card-width: min(86%, 42rem);
      --adaptive-panel-padding: 1.75rem;
    }

    .landing {
      gap: 24px;
    }

    .controls-panel {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      align-items: start;
    }

    .control-group:last-child:nth-child(odd) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 599px) {
    :root {
      --window-gutter: .875rem;
      --landing-card-width: 100%;
      --adaptive-panel-padding: 1rem;
      --adaptive-card-padding: .875rem;
      --hero-title-size: 3.45rem;
      --screen-title-size: 2.35rem;
      --section-title-size: 1.65rem;
      --body-copy-size: 1rem;
      --photo-strip-width: min(18.25rem, 100%);
    }

    .splash-logo {
      width: 5.5rem;
      border-radius: 24px;
      box-shadow: 0 10px 22px rgba(16, 20, 20, .14);
    }

    .landing,
    .camera-screen,
    .editor {
      width: min(100% - var(--window-gutter), 26.875rem);
    }

    .background-strip {
      display: none;
    }

    .background-strip-left {
      left: -118px;
      top: 16vh;
    }

    .background-strip-right {
      right: -120px;
      top: 9vh;
    }

    .camera-strip-preview {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .hero-actions,
    .camera-actions,
    .download-row {
      width: 100%;
      gap: 10px;
    }

    .primary-button,
    .secondary-button,
    .subtle-button {
      width: 100%;
      min-height: var(--touch-target);
      padding: 0 16px;
    }

    .camera-header,
    .editor-topbar {
      align-items: flex-start;
      flex-direction: column;
    }

    .icon-button,
    .compact {
      width: auto;
      align-self: flex-start;
    }

    .preset-grid,
    .segmented {
      grid-template-columns: 1fr;
    }

    .photo-strip {
      width: var(--photo-strip-width);
      padding: 12px;
    }

    .camera-card,
    .preview-panel,
    .controls-panel {
      border-radius: 16px;
      box-shadow: none;
    }

    .camera-preview {
      max-height: 48dvh;
      border-radius: 14px;
    }

    .camera-main .camera-actions {
      grid-template-columns: 1fr;
    }

    .retake-button {
      min-height: 28px;
    }
  }

  @media (max-width: 359px) {
    :root {
      --window-gutter: .625rem;
      --hero-title-size: 3rem;
      --screen-title-size: 2rem;
      --section-title-size: 1.45rem;
      --photo-strip-width: min(16.5rem, 100%);
    }

    .brand-block p,
    .upload-zone p,
    .camera-permission p {
      line-height: 1.48;
    }

    .upload-icon {
      width: 4rem;
      height: 4rem;
    }

    .camera-strip-slot {
      font-size: .88rem;
    }
  }

  @media (hover: none) {
    .primary-button:hover,
    .secondary-button:hover,
    .subtle-button:hover,
    .icon-button:hover,
    .swatch:hover,
    .segmented button:hover,
    .split-buttons button:hover,
    .retake-button:hover {
      transform: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .splash-screen,
    .splash-screen.leaving,
    .color-dialog-backdrop,
    .color-dialog,
    .screen-transition,
    .screen-transition.entering,
    .screen-transition.exiting,
    .screen-transition.entering .brand-block,
    .screen-transition.entering .upload-zone,
    .screen-transition.entering .camera-card,
    .screen-transition.entering .editor-topbar,
    .screen-transition.entering .preview-panel,
    .screen-transition.entering .controls-panel,
    .countdown,
    .camera-strip-slot.captured,
    .camera-strip-image,
    .fade-through-enter,
    .swatch.active,
    .segmented button.active,
    .split-buttons button.selected {
      animation: none;
      opacity: 1;
      transform: none;
    }

    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export default App;
