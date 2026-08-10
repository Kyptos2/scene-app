import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Default 10MB is tight for an uncompressed phone photo before
    // client-side resizing kicks in; avatar uploads get a small margin.
    proxyClientMaxBodySize: "15mb",
  },
};

export default nextConfig;
