import type { ImageUploadResult, VideoUploadResult } from "@s195640/content-editor";

// Trivial local mocks for the host app's upload callbacks — no server involved.
// A real host app would upload the file and return a hosted URL instead.

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockUploadImage(file: File): Promise<ImageUploadResult> {
  await delay(300 + Math.random() * 300);
  return { url: URL.createObjectURL(file), alt: file.name.replace(/\.[^.]+$/, "") };
}

export async function mockUploadVideo(file: File): Promise<VideoUploadResult> {
  await delay(300 + Math.random() * 300);
  const url = URL.createObjectURL(file);
  const { duration, poster } = await extractVideoMeta(url);
  return { url, poster, duration };
}

function extractVideoMeta(url: string): Promise<{ duration: number; poster: string }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const finish = (duration: number, poster: string) => resolve({ duration, poster });

    video.addEventListener("loadeddata", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const poster = canvas.toDataURL("image/jpeg", 0.7);
        finish(Number.isFinite(video.duration) ? video.duration : 0, poster);
      } catch {
        finish(Number.isFinite(video.duration) ? video.duration : 0, "");
      }
    });

    video.addEventListener("error", () => finish(0, ""));
    // Seek a touch in so loadeddata gives us a non-black frame where possible.
    video.currentTime = 0.1;
  });
}
