// Ensures react-native-appwrite does NOT carry its own nested copy of react-native.
// Yarn 1 ignores top-level "resolutions" for transitive deps when the constraint is
// a range, so we deduplicate manually after every install.
// Runs as `postinstall` from /app/frontend/package.json — works locally, in CI, and
// during Expo / EAS build prebuild steps.
const fs = require("fs");
const path = require("path");

const NESTED = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native-appwrite",
  "node_modules",
  "react-native"
);

const TOP_LEVEL_RELATIVE = path.join("..", "..", "react-native");
const TOP_LEVEL_ABS = path.join(
  __dirname,
  "..",
  "node_modules",
  "react-native"
);

function isSymlink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

function exists(p) {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

if (!exists(TOP_LEVEL_ABS)) {
  // Top-level RN missing — nothing we can do
  console.log("[dedupe-rn] top-level react-native not found, skipping");
  process.exit(0);
}

if (!exists(NESTED)) {
  console.log("[dedupe-rn] no nested react-native (already clean)");
  process.exit(0);
}

if (isSymlink(NESTED)) {
  console.log("[dedupe-rn] nested react-native is already a symlink (good)");
  process.exit(0);
}

console.log("[dedupe-rn] replacing nested react-native with symlink to top-level…");
try {
  fs.rmSync(NESTED, { recursive: true, force: true });
  fs.symlinkSync(TOP_LEVEL_RELATIVE, NESTED, "dir");
  console.log("[dedupe-rn] done");
} catch (e) {
  console.warn("[dedupe-rn] failed:", e.message);
  // Don't fail install
  process.exit(0);
}
