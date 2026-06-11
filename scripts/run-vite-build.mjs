import { spawnSync } from "node:child_process";

function hasBuildEnv(name) {
  return typeof process.env[name] === "string" && process.env[name].trim() !== "";
}

function run(command, args) {
  return spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

function getLinuxLibcPackage() {
  const report = process.report?.getReport?.();
  const glibc = report?.header?.glibcVersionRuntime;
  return glibc
    ? "@rollup/rollup-linux-x64-gnu"
    : "@rollup/rollup-linux-x64-musl";
}

function getRollupNativePackage() {
  if (process.platform === "linux" && process.arch === "x64") {
    return getLinuxLibcPackage();
  }

  if (process.platform === "darwin" && process.arch === "arm64") {
    return "@rollup/rollup-darwin-arm64";
  }

  if (process.platform === "darwin" && process.arch === "x64") {
    return "@rollup/rollup-darwin-x64";
  }

  if (process.platform === "win32" && process.arch === "x64") {
    return "@rollup/rollup-win32-x64-msvc";
  }

  if (process.platform === "win32" && process.arch === "arm64") {
    return "@rollup/rollup-win32-arm64-msvc";
  }

  return null;
}

function isMissingRollupNativeDependency(stderr = "") {
  return (
    stderr.includes("Cannot find module @rollup/rollup-") ||
    stderr.includes("npm has a bug related to optional dependencies")
  );
}

const firstBuild = spawnSync("npx", ["vite", "build"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});

console.log(
  [
    "[build-shell-env]",
    `VITE_SUPABASE_URL=${hasBuildEnv("VITE_SUPABASE_URL") ? "present" : "missing"}`,
    `VITE_SUPABASE_PUBLISHABLE_KEY=${hasBuildEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ? "present" : "missing"}`,
    `VITE_SUPABASE_PROJECT_ID=${hasBuildEnv("VITE_SUPABASE_PROJECT_ID") ? "present" : "missing"}`,
  ].join(" "),
);

if (firstBuild.status === 0) {
  process.stdout.write(firstBuild.stdout ?? "");
  process.stderr.write(firstBuild.stderr ?? "");
  process.exit(0);
}

const stderr = `${firstBuild.stdout ?? ""}\n${firstBuild.stderr ?? ""}`;
if (!isMissingRollupNativeDependency(stderr)) {
  process.stdout.write(firstBuild.stdout ?? "");
  process.stderr.write(firstBuild.stderr ?? "");
  process.exit(firstBuild.status ?? 1);
}

const pkg = getRollupNativePackage();
if (!pkg) {
  process.stdout.write(firstBuild.stdout ?? "");
  process.stderr.write(firstBuild.stderr ?? "");
  console.error(`Unable to auto-install a Rollup native package for ${process.platform}/${process.arch}.`);
  process.exit(firstBuild.status ?? 1);
}

console.warn(`Missing Rollup native dependency detected. Installing ${pkg}...`);
const install = run("npm", ["install", "--no-save", pkg]);
if (install.status !== 0) {
  process.exit(install.status ?? 1);
}

const secondBuild = run("npx", ["vite", "build"]);
process.exit(secondBuild.status ?? 1);
