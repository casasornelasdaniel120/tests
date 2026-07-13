import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // Supabase Storage local (supabase start)
      { protocol: "http", hostname: "localhost", port: "54321" },
      { protocol: "http", hostname: "127.0.0.1", port: "54321" },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
