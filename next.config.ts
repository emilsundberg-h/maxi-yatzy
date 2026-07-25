import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // `dev` runs under Turbopack by default; Serwist's plugin always attaches a
  // `webpack()` config function (even when `disable` is set, it's a no-op at
  // runtime), which otherwise trips Next's Turbopack/webpack-conflict check.
  turbopack: {},
};

export default withSerwist(nextConfig);
