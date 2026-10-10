import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {"/api/admin/walmart-flyer/*": ["./assets/admin/walmart-flyer/product-*.jpg"]},
  // Allow the local address used by phones testing this development server.
  allowedDevOrigins: ["10.0.0.216"],
};

export default nextConfig;
