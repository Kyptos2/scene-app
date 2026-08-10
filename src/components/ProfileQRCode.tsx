"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ProfileQRCode({ userId }: { userId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/connect/${userId}`;
    QRCode.toDataURL(url, { width: 240, margin: 1 }).then((generated) => {
      setConnectUrl(url);
      setDataUrl(generated);
    });
  }, [userId]);

  if (!dataUrl) {
    return <p className="text-sm text-neutral-500">Generating your QR code…</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-neutral-200 bg-white p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Your SCENE profile QR code" width={200} height={200} />
      <p className="text-center text-xs text-neutral-500">
        Let someone scan this to instantly connect with you
      </p>
      {connectUrl && (
        <p className="max-w-[240px] truncate text-center text-xs text-neutral-400">{connectUrl}</p>
      )}
    </div>
  );
}
