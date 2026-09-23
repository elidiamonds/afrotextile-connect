import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  MOBILE_LAUNCH_ASSETS,
  checkMobileLaunchAssets,
} = require("../artifacts/afrotextile-mobile/scripts/launch-assets.cjs");

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
  "artifacts/afrotextile/public/brand/official-icon.png",
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
  "artifacts/afrotextile-pitch/public/brand/official-icon.png",
  "artifacts/afrotextile-promo/public/brand/official-icon.png",
];

const failures = [];

function checkRequiredFiles() {
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
}

function checkWebMetadata() {
  const webIndexPath = path.join(
    workspaceRoot,
    "artifacts/afrotextile/index.html",
  );
  const webIndex = fs.readFileSync(webIndexPath, "utf8");
  const requiredWebMetadata = [
    '<link rel="icon" href="%BASE_URL%brand/favicon.ico" sizes="any" />',
    'href="%BASE_URL%brand/official-icon.png"',
    '<link rel="apple-touch-icon" href="%BASE_URL%brand/apple-touch-icon.png" />',
    '<meta property="og:image" content="%BASE_URL%brand/opengraph.png" />',
    '<meta name="twitter:image" content="%BASE_URL%brand/opengraph.png" />',
  ];

  for (const metadata of requiredWebMetadata) {
    if (!webIndex.includes(metadata)) {
      failures.push(`missing web metadata: ${metadata}`);
    }
  }
}

function checkMobileConfig() {
  const mobileConfigPath = path.join(
    workspaceRoot,
    "artifacts/afrotextile-mobile/app.json",
  );
  const mobileConfig = JSON.parse(fs.readFileSync(mobileConfigPath, "utf8"));
  const mobileExpoConfig = mobileConfig.expo;
  const requiredMobileConfig = [
    ["icon", "./assets/images/icon.png", mobileExpoConfig.icon],
    [
      "splash.image",
      "./assets/images/splash.png",
      mobileExpoConfig.splash?.image,
    ],
    ["web.favicon", "./assets/images/icon.png", mobileExpoConfig.web?.favicon],
  ];

  for (const [setting, expected, actual] of requiredMobileConfig) {
    if (actual !== expected) {
      failures.push(
        `mobile app.json ${setting} should be "${expected}" (found "${actual ?? "undefined"}")`,
      );
    }
  }

  const configuredLaunchAssets = [
    ["icon", mobileExpoConfig.icon],
    ["splash.image", mobileExpoConfig.splash?.image],
  ];
  for (const [setting, actual] of configuredLaunchAssets) {
    const expected = `./${MOBILE_LAUNCH_ASSETS.find(
      (asset) => asset.name === (setting === "splash.image" ? "splash" : setting),
    ).sourcePath}`;
    if (actual !== expected) {
      failures.push(
        `mobile app.json ${setting} must point to the approved ${setting === "splash.image" ? "splash" : "icon"} artwork at "${expected}"`,
      );
    }
  }

  for (const failure of checkMobileLaunchAssets(
    path.join(workspaceRoot, "artifacts/afrotextile-mobile"),
  )) {
    failures.push(failure);
  }
}

function normalizeBasePath(rawBasePath) {
  if (!rawBasePath) {
    throw new Error(
      "BASE_PATH is required when checking the built Afrotextile web artifact.",
    );
  }

  const withLeadingSlash = rawBasePath.startsWith("/")
    ? rawBasePath
    : `/${rawBasePath}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

const publishedAssetPaths = [
  "brand/favicon.ico",
  "brand/threaded-a-compact.svg",
  "brand/official-icon.png",
  "brand/opengraph.png",
  "brand/apple-touch-icon.png",
];

function getContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".ico":
      return "image/x-icon";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function createBuiltOutputServer(distDir, basePath) {
  return http.createServer(async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405);
      response.end();
      return;
    }

    const requestPath = new URL(request.url ?? "/", "http://127.0.0.1")
      .pathname;
    if (!requestPath.startsWith(basePath)) {
      response.writeHead(404);
      response.end();
      return;
    }

    let relativePath;
    try {
      relativePath = decodeURIComponent(requestPath.slice(basePath.length));
    } catch {
      response.writeHead(400);
      response.end();
      return;
    }

    const filePath = path.resolve(distDir, relativePath);
    if (filePath !== distDir && !filePath.startsWith(`${distDir}${path.sep}`)) {
      response.writeHead(403);
      response.end();
      return;
    }

    try {
      const file = await fs.promises.readFile(
        filePath === distDir ? path.join(distDir, "index.html") : filePath,
      );
      response.writeHead(200, {
        "Content-Length": file.byteLength,
        "Content-Type": getContentType(filePath),
      });
      if (request.method === "HEAD") {
        response.end();
      } else {
        response.end(file);
      }
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function checkBuiltOutput() {
  const distDir = path.join(workspaceRoot, "artifacts/afrotextile/dist/public");
  if (!fs.existsSync(distDir)) {
    failures.push(
      "missing built web output: artifacts/afrotextile/dist/public (run the web build first)",
    );
    return;
  }

  const basePath = normalizeBasePath(process.env.BASE_PATH);
  const server = createBuiltOutputServer(distDir, basePath);
  const port = await listen(server);

  try {
    for (const assetPath of publishedAssetPaths) {
      const assetUrl = `http://127.0.0.1:${port}${basePath}${assetPath}`;
      const response = await fetch(assetUrl);
      const body = await response.arrayBuffer();

      if (!response.ok) {
        failures.push(
          `built web asset request failed: ${basePath}${assetPath} (${response.status})`,
        );
      } else if (body.byteLength === 0) {
        failures.push(
          `built web asset response was empty: ${basePath}${assetPath}`,
        );
      } else {
        console.log(
          `served built web asset: ${basePath}${assetPath} (${body.byteLength} bytes)`,
        );
      }
    }
  } finally {
    await close(server);
  }
}

function getPublishedBaseUrl() {
  const publishedFlagIndex = process.argv.indexOf("--published");
  const publishedUrlFlagIndex = process.argv.indexOf("--published-url");
  const inlinePublishedUrl = process.argv.find((argument) =>
    argument.startsWith("--published-url="),
  );
  const flagIndex =
    publishedUrlFlagIndex >= 0 ? publishedUrlFlagIndex : publishedFlagIndex;
  const flagValue =
    flagIndex >= 0 && process.argv[flagIndex + 1]?.startsWith("--") === false
      ? process.argv[flagIndex + 1]
      : undefined;
  const rawUrl =
    inlinePublishedUrl?.slice("--published-url=".length) ??
    flagValue ??
    process.env.AFROTEXTILE_PUBLISHED_URL ??
    process.env.PUBLISHED_URL;

  if (!rawUrl) {
    failures.push(
      "AFROTEXTILE_PUBLISHED_URL or PUBLISHED_URL is required when checking the published web artifact",
    );
    return null;
  }

  let publishedUrl;
  try {
    publishedUrl = new URL(rawUrl);
  } catch {
    failures.push(`published web URL is invalid: ${rawUrl}`);
    return null;
  }

  if (publishedUrl.protocol !== "http:" && publishedUrl.protocol !== "https:") {
    failures.push(
      `published web URL must use http or https: ${publishedUrl.protocol}`,
    );
    return null;
  }

  publishedUrl.pathname = publishedUrl.pathname.replace(/\/+$/, "") + "/";
  publishedUrl.search = "";
  publishedUrl.hash = "";
  return publishedUrl;
}

async function checkPublishedOutput() {
  const publishedBaseUrl = getPublishedBaseUrl();
  if (!publishedBaseUrl) {
    return;
  }

  for (const assetPath of publishedAssetPaths) {
    const assetUrl = new URL(assetPath, publishedBaseUrl);

    try {
      const response = await fetch(assetUrl);
      const body = await response.arrayBuffer();

      if (!response.ok) {
        failures.push(
          `published web asset request failed: ${assetUrl} (${response.status})`,
        );
      } else if (body.byteLength === 0) {
        failures.push(
          `published web asset response was empty: ${assetUrl}`,
        );
      } else {
        console.log(
          `served published web asset: ${assetUrl} (${body.byteLength} bytes)`,
        );
      }
    } catch (error) {
      failures.push(
        `published web asset request failed: ${assetUrl} (${error.message})`,
      );
    }
  }
}

async function main() {
  checkRequiredFiles();
  checkWebMetadata();
  checkMobileConfig();

  const checksBuiltOutput = process.argv.includes("--built");
  const checksPublishedOutput =
    process.argv.includes("--published") ||
    process.argv.includes("--published-url");
  if (checksBuiltOutput) {
    await checkBuiltOutput();
  }
  if (checksPublishedOutput) {
    await checkPublishedOutput();
  }

  if (failures.length > 0) {
    console.error("Afrotextile brand asset check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `Afrotextile brand asset check passed (${requiredFiles.length} files and release metadata${checksBuiltOutput ? "; built web assets served" : ""}${checksPublishedOutput ? "; published web assets served" : ""}).`,
    );
  }
}

await main();
