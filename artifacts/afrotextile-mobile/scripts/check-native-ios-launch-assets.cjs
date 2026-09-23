const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  NATIVE_IOS_LAUNCH_ASSETS,
  checkMobileLaunchAssets,
  describeAssetFailure,
} = require("./launch-assets.cjs");

const projectRoot = path.resolve(__dirname, "..");

function copyNativeBuildInputs(stagingRoot) {
  for (const filename of [
    "app.json",
    "babel.config.js",
    "metro.config.js",
    "package.json",
  ]) {
    fs.copyFileSync(
      path.join(projectRoot, filename),
      path.join(stagingRoot, filename),
    );
  }

  fs.cpSync(
    path.join(projectRoot, "assets"),
    path.join(stagingRoot, "assets"),
    { recursive: true },
  );

  fs.symlinkSync(
    path.join(projectRoot, "node_modules"),
    path.join(stagingRoot, "node_modules"),
    "dir",
  );
}

function findIosProjectRoot(nativeRoot) {
  const iosRoot = path.join(nativeRoot, "ios");
  if (!fs.existsSync(iosRoot)) {
    return null;
  }

  const projectDirectory = fs
    .readdirSync(iosRoot, { withFileTypes: true })
    .find(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(iosRoot, entry.name, "Images.xcassets")),
    );

  return projectDirectory
    ? path.join(iosRoot, projectDirectory.name)
    : null;
}

function checkNativeAssetCatalog(nativeProjectRoot) {
  const failures = [];

  for (const asset of NATIVE_IOS_LAUNCH_ASSETS) {
    const filePath = path.join(nativeProjectRoot, asset.relativePath);
    const failure = describeAssetFailure(
      asset,
      filePath,
      "Native iOS launch",
    );
    if (failure) {
      failures.push(failure);
    } else {
      console.log(
        `verified native iOS ${asset.name}: ${path.relative(
          nativeProjectRoot,
          filePath,
        )}`,
      );
    }
  }

  const iconContentsPath = path.join(
    nativeProjectRoot,
    "Images.xcassets",
    "AppIcon.appiconset",
    "Contents.json",
  );
  const splashContentsPath = path.join(
    nativeProjectRoot,
    "Images.xcassets",
    "SplashScreenLegacy.imageset",
    "Contents.json",
  );
  const storyboardPath = path.join(
    nativeProjectRoot,
    "SplashScreen.storyboard",
  );

  for (const [name, filePath, requiredText] of [
    ["app icon catalog", iconContentsPath, "App-Icon-1024x1024@1x.png"],
    ["splash catalog", splashContentsPath, "image@3x.png"],
    ["splash storyboard image", storyboardPath, 'image="SplashScreenLegacy"'],
    ["splash storyboard background", storyboardPath, 'name="SplashScreenBackground"'],
  ]) {
    if (!fs.existsSync(filePath)) {
      failures.push(`Native iOS ${name} is missing: ${filePath}`);
      continue;
    }

    const contents = fs.readFileSync(filePath, "utf8");
    if (!contents.includes(requiredText)) {
      failures.push(
        `Native iOS ${name} is missing the expected launch asset reference "${requiredText}": ${filePath}`,
      );
    }
  }

  return failures;
}

function buildNativeIosProject() {
  const stagingRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "afrotextile-native-ios-"),
  );

  try {
    copyNativeBuildInputs(stagingRoot);

    const expoBinary = path.join(stagingRoot, "node_modules", ".bin", "expo");
    const result = spawnSync(
      expoBinary,
      ["prebuild", "--platform", "ios", "--no-install", "--clean"],
      {
        cwd: stagingRoot,
        env: { ...process.env, CI: "1" },
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    if (result.error) {
      throw new Error(`Expo prebuild could not start: ${result.error.message}`);
    }
    if (result.status !== 0) {
      const output = [result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n")
        .trim();
      throw new Error(
        `Expo native iOS prebuild failed${output ? `:\n${output}` : ""}`,
      );
    }

    const nativeProjectRoot = findIosProjectRoot(stagingRoot);
    if (!nativeProjectRoot) {
      throw new Error(
        `Expo native iOS prebuild did not produce an iOS asset catalog: ${path.join(
          stagingRoot,
          "ios",
        )}`,
      );
    }

    console.log(`Produced native iOS launch project: ${nativeProjectRoot}`);
    return checkNativeAssetCatalog(nativeProjectRoot);
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

function main() {
  const failures = checkMobileLaunchAssets(projectRoot);
  if (failures.length > 0) {
    console.error("Native Afrotextile launch asset check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  try {
    failures.push(...buildNativeIosProject());
  } catch (error) {
    failures.push(error.message);
  }

  if (failures.length > 0) {
    console.error("Native Afrotextile launch asset check failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Native Afrotextile launch asset check passed (${NATIVE_IOS_LAUNCH_ASSETS.length} native iOS artwork files and launch references verified).`,
  );
}

main();