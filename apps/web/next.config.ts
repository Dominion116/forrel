import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@forrel/core"],
  turbopack: {
    resolveAlias: {
      // Only Base Account's unused server-side payment code imports this. See the stub for why.
      "@coinbase/cdp-sdk": "./lib/stubs/cdp-sdk.ts",
    },
  },
  async rewrites() {
    return [
      {
        source: "/lcd-testnet/:path*",
        destination: "https://api-testnet.qore.host/:path*",
      },
      {
        source: "/lcd-mainnet/:path*",
        destination: "https://api.qore.host/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
