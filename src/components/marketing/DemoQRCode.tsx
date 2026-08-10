"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Points at this same site's own /signup — durable regardless of hosting
// changes, unlike hardcoding today's demo tunnel URL into committed source.
export function DemoQRCode() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `${window.location.origin}/signup`;
    QRCode.toDataURL(url, { width: 160, margin: 1 }).then(setDataUrl);
  }, []);

  return (
    <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-lg border border-border bg-white p-1.5">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="QR code linking to SCENE sign up" width={80} height={80} />
      ) : (
        <div className="h-20 w-20 animate-pulse rounded bg-surface2" />
      )}
    </div>
  );
}
