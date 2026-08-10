"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Starting camera…");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameId: number;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setError("Couldn't access the camera. Check your browser permissions.");
        return;
      }

      if (stopped || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("Point your camera at a SCENE QR code");
      tick();
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        try {
          const url = new URL(code.data);
          if (url.origin === window.location.origin && url.pathname.startsWith("/connect/")) {
            stopped = true;
            router.push(url.pathname);
            return;
          }
          setStatus("That QR code isn't a SCENE profile. Keep scanning…");
        } catch {
          setStatus("That doesn't look like a SCENE QR code. Keep scanning…");
        }
      }

      frameId = requestAnimationFrame(tick);
    }

    start();

    return () => {
      stopped = true;
      if (frameId) cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [router]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-10">
      <h1 className="text-xl font-bold text-neutral-900">Scan to connect</h1>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <>
          <div className="w-full overflow-hidden rounded-lg border border-neutral-200 bg-black">
            <video ref={videoRef} className="w-full" muted playsInline />
          </div>
          <p className="text-sm text-neutral-600">{status}</p>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
