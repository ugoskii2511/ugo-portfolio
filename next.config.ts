import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Project screenshots uploaded through /api/upload live in Supabase Storage.
    remotePatterns: [
      new URL("https://rajwqeoljkqxuaauifen.supabase.co/storage/v1/object/public/**"),
    ],
    formats: ["image/avif", "image/webp"],
    // Local preview only: some networks resolve Supabase to NAT64 (64:ff9b::)
    // addresses, which the optimizer treats as private and refuses. Never set
    // LOCAL_PREVIEW in production.
    dangerouslyAllowLocalIP: process.env.LOCAL_PREVIEW === "1",
  },
  async redirects() {
    // The portfolio index moved to /work in the 2026 redesign.
    return [{ source: "/portfolio", destination: "/work", permanent: true }];
  },
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
