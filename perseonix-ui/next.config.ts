import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite loads its WASM runtime from disk, react-pdf brings its own React
  // reconciler and Playwright spawns a browser; none may be bundled.
  serverExternalPackages: ["@electric-sql/pglite", "@react-pdf/renderer", "playwright-core"],

  // Hide the Next.js dev-tools badge; it overlaps the portal's sidebar user menu.
  devIndicators: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
