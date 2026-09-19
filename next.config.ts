import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      // Maintenance requests can contain three 5 MB images plus multipart overhead.
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
