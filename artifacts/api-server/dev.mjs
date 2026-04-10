import { spawnSync } from "node:child_process";

process.env.NODE_ENV = "development";
process.env.PORT = process.env.PORT || "3000";

const build = spawnSync(process.execPath, ["./build.mjs"], {
  cwd: import.meta.dirname,
  stdio: "inherit",
  env: process.env,
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

await import("./dist/index.mjs");
