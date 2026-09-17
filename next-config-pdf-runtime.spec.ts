import assert from "node:assert/strict";
import nextConfig from "./next.config";

const optimizePackageImports =
    nextConfig.experimental?.optimizePackageImports ?? [];
const serverExternalPackages = nextConfig.serverExternalPackages ?? [];

assert.ok(
    !optimizePackageImports.includes("@react-pdf/renderer"),
    "@react-pdf/renderer must not be listed in experimental.optimizePackageImports because production SSR bundling can break React PDF reconciler internals",
);

assert.ok(
    serverExternalPackages.includes("@react-pdf/renderer"),
    "@react-pdf/renderer must be listed in serverExternalPackages so server PDF generation uses the Node package instead of the optimized server bundle",
);

assert.ok(
    serverExternalPackages.includes("googleapis"),
    "googleapis must remain externalized because it was already required by the existing Next.js config",
);

console.log("next-config PDF runtime guard passed");
