import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Lets src/app/global-not-found.tsx handle URLs that don't match either
    // root layout ((marketing) or (dashboard)) — needed because this app has
    // no single top-level layout to compose a global 404 from.
    globalNotFound: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
