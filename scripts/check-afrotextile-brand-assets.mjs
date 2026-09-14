import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const requiredFiles = [
  "artifacts/afrotextile/public/brand/threaded-a-compact.svg",
  "artifacts/afrotextile/public/brand/threaded-a-primary.svg",
  "artifacts/afrotextile/public/brand/threaded-a-light.svg",
  "artifacts/afrotextile/public/brand/threaded-a-dark.svg",
  "artifacts/afrotextile/public/brand/threaded-a-one-color.svg",
  "artifacts/afrotextile/public/brand/favicon.ico",
  "artifacts/afrotextile/public/brand/favicon.svg",
  "artifacts/afrotextile/public/brand/apple-touch-icon.png",
  "artifacts/afrotextile/public/brand/opengraph.png",
  "artifacts/afrotextile/public/brand/opengraph.svg",
  "artifacts/afrotextile-mobile/assets/brand/threaded-a-compact.png",
  "artifacts/afrotextile-mobile/assets/brand/threaded-a-primary.png",
  "artifacts/afrotextile-mobile/assets/brand/threaded-a-light.png",
  "artifacts/afrotextile-mobile/assets/brand/threaded-a-dark.png",
  "artifacts/afrotextile-mobile/assets/brand/threaded-a-one-color.png",
  "artifacts/afrotextile-mobile/assets/images/icon.png",
  "artifacts/afrotextile-mobile/assets/images/splash.png",
];

const failures = [];

for (const relativePath of requiredFiles) {
  const filePath = path.join(workspaceRoot, relativePath);

  if (!fs.existsSync(filePath)) {
    failures.push(`missing file: ${relativePath}`);
    continue;
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile() || stats.size === 0) {
    failures.push(`empty or invalid file: ${relativePath}`);
  }
}

const webIndexPath = path.join(
  workspaceRoot,
  "artifacts/afrotextile/index.html",
);
const webIndex = fs.readFileSync(webIndexPath, "utf8");
const requiredWebMetadata = [
  '<link rel="icon" type="image/svg+xml" href="/brand/threaded-a-compact.svg" />',
  '<link rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />',
  '<meta property="og:image" content="/brand/opengraph.png" />',
  '<meta name="twitter:image" content="/brand/opengraph.png" />',
];

for (const metadata of requiredWebMetadata) {
  if (!webIndex.includes(metadata)) {
    failures.push(`missing web metadata: ${metadata}`);
  }
}

const mobileConfigPath = path.join(
  workspaceRoot,
  "artifacts/afrotextile-mobile/app.json",
);
const mobileConfig = JSON.parse(fs.readFileSync(mobileConfigPath, "utf8"));
const mobileExpoConfig = mobileConfig.expo;
const requiredMobileConfig = [
  ["icon", "./assets/images/icon.png", mobileExpoConfig.icon],
  ["splash.image", "./assets/images/splash.png", mobileExpoConfig.splash?.image],
  ["web.favicon", "./assets/images/icon.png", mobileExpoConfig.web?.favicon],
];

for (const [setting, expected, actual] of requiredMobileConfig) {
  if (actual !== expected) {
    failures.push(
      `mobile app.json ${setting} should be "${expected}" (found "${actual ?? "undefined"}")`,
    );
  }
}

if (failures.length > 0) {
  console.error("Afrotextile brand asset check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Afrotextile brand asset check passed (${requiredFiles.length} files and release metadata).`,
  );
}