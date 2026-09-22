export type Frame = { time: string; seconds: number; dataUrl: string };

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function extractFrames(
  file: File,
  count = 8,
  onProgress?: (done: number, total: number) => void,
): Promise<{ frames: Frame[]; duration: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Không đọc được video. Hãy thử định dạng MP4/WEBM/MOV."));
  });

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (!duration) {
    URL.revokeObjectURL(url);
    throw new Error("Không xác định được thời lượng video.");
  }

  const canvas = document.createElement("canvas");
  const maxW = 720;
  const scale = Math.min(1, maxW / (video.videoWidth || maxW));
  canvas.width = Math.round((video.videoWidth || maxW) * scale);
  canvas.height = Math.round((video.videoHeight || 480) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ trích xuất khung hình.");

  const frames: Frame[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.min(duration - 0.05, (duration * (i + 0.5)) / count);
    await new Promise<void>((resolve, reject) => {
      const onSeeked = () => {
        video.removeEventListener("seeked", onSeeked);
        resolve();
      };
      video.addEventListener("seeked", onSeeked);
      video.onerror = () => reject(new Error("Lỗi khi đọc khung hình video."));
      video.currentTime = t;
    });
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    frames.push({
      time: formatTime(t),
      seconds: t,
      dataUrl: canvas.toDataURL("image/jpeg", 0.7),
    });
    onProgress?.(i + 1, count);
  }

  URL.revokeObjectURL(url);
  return { frames, duration };
}
