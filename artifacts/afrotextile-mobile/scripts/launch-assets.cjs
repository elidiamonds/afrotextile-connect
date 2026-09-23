const crypto = require("crypto");
const net = require("net");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const MOBILE_LAUNCH_ASSETS = [
  {
    name: "icon",
    sourcePath: "assets/images/icon.png",
    outputPath: "assets/images/icon.png",
    sha256:
      "33f1849277b9495907b60692686216b70acdedb41668e0f5fb9c925f5d9f6a31",
  },
  {
    name: "splash",
    sourcePath: "assets/images/splash.png",
    outputPath: "assets/images/splash.png",
    sha256:
      "4c744d8483e637fde3e168eae3abceb9eec8be5ae675ff5eb4daaa9b86df2862",
  },
];

const NATIVE_IOS_LAUNCH_ASSETS = [
  {
    name: "iOS app icon",
    relativePath:
      "Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png",
    sha256:
      "afef00be7d0be9ee82aeb3dd09fc6f4c7654a3d9ed69e4118f42fb793ea69d68",
  },
  {
    name: "iOS splash (1x)",
    relativePath: "Images.xcassets/SplashScreenLegacy.imageset/image.png",
    sha256:
      "eebb32d086470ffdfd9a632956328481192b88ceae5c18de29801259844e3af5",
  },
  {
    name: "iOS splash (2x)",
    relativePath: "Images.xcassets/SplashScreenLegacy.imageset/image@2x.png",
    sha256:
      "eebb32d086470ffdfd9a632956328481192b88ceae5c18de29801259844e3af5",
  },
  {
    name: "iOS splash (3x)",
    relativePath: "Images.xcassets/SplashScreenLegacy.imageset/image@3x.png",
    sha256:
      "eebb32d086470ffdfd9a632956328481192b88ceae5c18de29801259844e3af5",
  },
];

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function describeAssetFailure(asset, filePath, context) {
  if (!fs.existsSync(filePath)) {
    return `${context} ${asset.name} asset is missing: ${filePath}`;
  }

  const stats = fs.statSync(filePath);
  if (!stats.isFile() || stats.size === 0) {
    return `${context} ${asset.name} asset is empty or invalid: ${filePath}`;
  }

  const actualHash = sha256File(filePath);
  if (actualHash !== asset.sha256) {
    return (
      `${context} ${asset.name} asset does not match the approved Afrotextile artwork: ` +
      `${filePath} (expected SHA-256 ${asset.sha256}, found ${actualHash})`
    );
  }

  return null;
}

function checkMobileLaunchAssets(projectRoot) {
  return MOBILE_LAUNCH_ASSETS.map((asset) =>
    describeAssetFailure(
      asset,
      path.join(projectRoot, asset.sourcePath),
      "Mobile launch",
    ),
  ).filter(Boolean);
}

function copyMobileLaunchAssets(projectRoot, timestamp) {
  const outputRoot = path.join(
    projectRoot,
    "static-build",
    timestamp,
    "_expo",
    "static",
    "js",
  );

  for (const asset of MOBILE_LAUNCH_ASSETS) {
    const sourcePath = path.join(projectRoot, asset.sourcePath);
    const sourceFailure = describeAssetFailure(asset, sourcePath, "Mobile launch");
    if (sourceFailure) {
      throw new Error(sourceFailure);
    }

    const outputPath = path.join(outputRoot, asset.outputPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.copyFileSync(sourcePath, outputPath);

    const outputFailure = describeAssetFailure(
      asset,
      outputPath,
      "Generated mobile release",
    );
    if (outputFailure) {
      throw new Error(outputFailure);
    }

    console.log(`Copied verified ${asset.name} launch asset: ${asset.outputPath}`);
  }

  return MOBILE_LAUNCH_ASSETS.length;
}

function normalizeBasePath(rawBasePath) {
  const withLeadingSlash = rawBasePath?.startsWith("/")
    ? rawBasePath
    : `/${rawBasePath || ""}`;
  const normalized = withLeadingSlash.replace(/\/+$/, "");
  return normalized === "/" ? "" : normalized;
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : null;
      probe.close((error) => {
        if (error) {
          reject(error);
        } else if (!port) {
          reject(
            new Error(
              "Could not determine a free port for the mobile asset server",
            ),
          );
        } else {
          resolve(port);
        }
      });
    });
  });
}

async function waitForServer(url, child) {
  let lastError;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      const output = child.stderr.read()?.toString().trim();
      throw new Error(
        `Mobile asset server exited before it was ready${output ? `: ${output}` : ""}`,
      );
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(250),
      });
      if (response.status < 500) {
        return;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(
    `Mobile asset server did not become ready at ${url}: ${lastError?.message || "timeout"}`,
  );
}

function releaseAssetUrl({ port, basePath, timestamp, asset }) {
  return (
    `http://127.0.0.1:${port}${basePath}/${timestamp}/_expo/static/js/` +
    asset.outputPath
  );
}

async function checkServedMobileLaunchAssets(projectRoot, timestamp, options = {}) {
  const basePath = normalizeBasePath(options.basePath || "/mobile/");
  const port = options.port || (await getAvailablePort());
  const serverPath = path.join(projectRoot, "server", "serve.js");
  const child = spawn(process.execPath, [serverPath], {
    cwd: projectRoot,
    env: {
      ...process.env,
      BASE_PATH: basePath || "/",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  const failures = [];
  const readinessUrl = `http://127.0.0.1:${port}${basePath || "/"}`;

  try {
    await waitForServer(readinessUrl, child);

    for (const asset of MOBILE_LAUNCH_ASSETS) {
      const url = releaseAssetUrl({ port, basePath, timestamp, asset });

      try {
        const response = await fetch(url);
        const body = Buffer.from(await response.arrayBuffer());

        if (!response.ok) {
          failures.push(
            `${asset.name} launch asset is unavailable at ${url}: HTTP ${response.status}`,
          );
        } else if (body.length === 0) {
          failures.push(`${asset.name} launch asset is empty at ${url}`);
        } else if (
          response.headers.get("content-type")?.split(";")[0] !== "image/png"
        ) {
          failures.push(
            `${asset.name} launch asset at ${url} returned ` +
              `${response.headers.get("content-type") || "no content type"}, expected image/png`,
          );
        } else if (
          body.length < 8 ||
          body.readUInt32BE(0) !== 0x89504e47 ||
          body.readUInt32BE(4) !== 0x0d0a1a0a
        ) {
          failures.push(`${asset.name} launch asset at ${url} is not a PNG response`);
        } else {
          const actualHash = crypto
            .createHash("sha256")
            .update(body)
            .digest("hex");
          if (actualHash !== asset.sha256) {
            failures.push(
              `${asset.name} launch asset at ${url} does not match the approved ` +
                `artwork (expected SHA-256 ${asset.sha256}, found ${actualHash})`,
            );
          } else {
            console.log(
              `Served verified ${asset.name} launch asset: ${url} (${body.length} bytes)`,
            );
          }
        }
      } catch (error) {
        failures.push(
          `${asset.name} launch asset request failed at ${url}: ${error.message}`,
        );
      }
    }
  } finally {
    await new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve();
        return;
      }

      child.once("exit", resolve);
      child.kill();
    });
  }

  if (failures.length > 0) {
    throw new Error(
      "Mobile release launch asset server check failed:\n" +
        failures.map((failure) => `- ${failure}`).join("\n"),
    );
  }

  return MOBILE_LAUNCH_ASSETS.length;
}

module.exports = {
  MOBILE_LAUNCH_ASSETS,
  NATIVE_IOS_LAUNCH_ASSETS,
  checkMobileLaunchAssets,
  checkServedMobileLaunchAssets,
  copyMobileLaunchAssets,
  describeAssetFailure,
};
