// Install the actual archive outside the checkout to catch workspace dependencies.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const temp = await mkdtemp(join(tmpdir(), "web-discover-package-"));
try {
  const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  const [archive] = JSON.parse(
    execFileSync(
      npm,
      ["pack", "--ignore-scripts", "--pack-destination", temp, "--json"],
      { cwd: root, encoding: "utf8" },
    ),
  );
  const files = archive.files.map((file) => file.path);
  assert.ok(files.includes("bin/cli.js"));
  assert.ok(files.includes("dist/index.js"));
  assert.ok(files.includes("dist/index.d.ts"));
  assert.ok(files.includes("dist/cli.js"));
  assert.ok(
    !files.some((file) =>
      /(^|\/)(src|tests|node_modules|artifact|artifacts)(\/|$)|\.local\.json$/.test(
        file,
      ),
    ),
  );
  const dependencies = {
    "web-discover": `file:${join(temp, archive.filename)}`,
  };
  const lock = JSON.parse(
    await readFile(join(root, "package-lock.json"), "utf8"),
  );
  lock.packages[""] = { dependencies };
  lock.packages["node_modules/web-discover"] = {
    version: pkg.version,
    resolved: dependencies["web-discover"],
    integrity: archive.integrity,
    dependencies: pkg.dependencies,
    bin: pkg.bin,
    engines: pkg.engines,
  };
  await writeFile(
    join(temp, "package.json"),
    JSON.stringify({ private: true, type: "module", dependencies }),
  );
  await writeFile(join(temp, "package-lock.json"), JSON.stringify(lock));
  execFileSync(
    npm,
    [
      "ci",
      "--offline",
      "--ignore-scripts",
      "--omit=dev",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: temp, stdio: "pipe" },
  );
  await writeFile(
    join(temp, "probe.mjs"),
    `
import assert from 'node:assert/strict';
import {buildModel, discoverUrl, discoverUrls, discoverSitemap, writeDiscoveryReport} from 'web-discover';
import {main} from 'web-discover/cli';
for (const fn of [discoverUrl, discoverUrls, discoverSitemap, writeDiscoveryReport, main]) assert.equal(typeof fn, 'function');
const model = buildModel({entry: {url: 'https://example.test/', title: 'Home', headings: ['Home'], forms: [], buttons: [], alerts: []}}, [], []);
assert.equal(model.models[0].vertices.length, 1);
assert.equal(await main(['--help']), 0);
await writeDiscoveryReport(model, [], {output: './report.html'});
`,
  );
  const env = { ...process.env, PATH: "" };
  const probe = execFileSync(process.execPath, [join(temp, "probe.mjs")], {
    cwd: temp,
    env,
    encoding: "utf8",
  });
  assert.match(probe, /Web Discover/);
  const help = execFileSync(
    process.execPath,
    [join(temp, "node_modules/web-discover/bin/cli.js"), "--help"],
    { cwd: temp, env, encoding: "utf8" },
  );
  assert.match(help, /web-discover discover-url/);
  assert.match(
    await readFile(join(temp, "report.html"), "utf8"),
    /web <span>discover<\/span>/,
  );
  console.log(
    "Standalone archive passed: runtime-only install, public API, CLI and report without checkout links or PATH.",
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
