import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "mosaic.scdn.co" },
      { protocol: "https", hostname: "*.scdn.co" },
      { protocol: "https", hostname: "i1.sndcdn.com" },
      { protocol: "https", hostname: "ra.co" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
