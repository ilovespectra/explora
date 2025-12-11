import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/archive/**', '**/node_modules/**']
    };
    return config;
  },
  // Exclude archive from type checking
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
