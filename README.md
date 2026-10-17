# web-discover

Explore a website with Crawlee and Playwright, then inspect its observed states, journeys, screenshots and JSON network evidence in a standalone HTML viewer. The same run exports a GraphWalker model draft for review and reuse.

web-discover runs independently of Testwalker. It needs no Rust framework or decision-provider key.

The output records observed behavior. Review the navigation and add independent business rules before treating it as a test specification.

## Setup and first run

Requires Node.js 22 or later, npm and Google Chrome. Clone the repository and install its dependencies:

```bash
git clone https://github.com/mattlock83/web-discover.git
cd web-discover
npm ci
```

Installation builds the package. If Google Chrome is not already installed, install it with `npx playwright install chrome`.

To explore an already hosted site, replace the URL below with its address:

```bash
npx --no-install web-discover discover-url \
  --url https://your-test-site.example/ --output models/site.model.json \
  --depth 1 --headed
```

To use the CLI from any directory, install directly from GitHub:

```bash
npm install --global github:mattlock83/web-discover
web-discover --help
```

For a local application, start its development server and pass its address, for example `--url http://localhost:3000/`. Add `--click-buttons --probe-empty-forms` to explore buttons and empty form submissions.

Choose a new output name for each run; existing output files are not overwritten.

## Output

With `--output models/site.model.json`, the tool writes:

```text
models/
  site.model.json
  artifact/
    2026-10-13T02-19-25.969Z-49708-0/
      site.discovery.json
      index.html
      visit-0001/
        screenshot.png
        network.json
      visit-0002/
        ...
```

The model stays at the requested path. The inventory, viewer and visit assets share a run folder under `artifact/` beside that model. Run names use a UTC timestamp, process ID and sequence number to avoid collisions. Asset files are created when capture is enabled and available. The CLI prints the exact model, inventory and report paths.

A stem or `.json` output name is normalized to `.model.json`. The inventory contains the observations and evidence; the model is a separate export that can be used with [Testwalker](https://github.com/mattlock83/testwalker) after review.

Open `index.html` directly in a browser. It shows URL-grouped or observed-state graphs, visits, screenshots, issues and JSON request/response previews. Keep the model and its `artifact/` run folder together when sharing them. Page HTML and DOM snapshots are not saved.

## Sitemap mode

```bash
npx --no-install web-discover discover-sitemap \
  --sitemap /path/to/sitemap.xml --output models/site.model.json
```

The input is a local XML `urlset` file. Expand sitemap indexes separately. All listed URLs must share an origin. Sitemap mode inspects only those URLs, follows no unlisted links and submits no forms. If the site has no sitemap, use URL mode.

## Exploration options

URL mode follows in-scope links and submits native forms within `--depth`, default 1. Add `--click-buttons` to explore non-submit buttons and accessible custom options. Add `--probe-empty-forms` to observe rejection screens beside default submissions. These actions can change application data; use a suitable test environment.

Field samples come from observed values and HTML attributes where available, with defaults and optional `--values` overrides. Discovery records constraints as suggestions, not independent validation rules. See [options, values and hooks](docs/discovery.md).

Discovery can leave terminal or deferred states. A draft therefore may not support a complete GraphWalker traversal until reviewed. A successful crawl does not mean the generated model is complete or the website passed tests.

## Rebuild a viewer without crawling

```bash
npx --no-install web-discover report \
  --inventory models/artifact/RUN/site.discovery.json \
  --model models/site.model.json \
  --output models/artifact/RUN/rebuilt/index.html
```

Replace `RUN` with the timestamped folder printed by discovery. Omitting `--output` places the viewer beside the first inventory; choose a new filename to rebuild an existing viewer. Repeat `--inventory` to combine runs with the same seeds. Without `--model`, the viewer builds a draft from the supplied observations. The output must be new.

## Configuration and development

`--browser-config` accepts discovery's own Playwright `launch` and `context` settings. Execution-adapter settings such as uploads, CDP and settling keys are not accepted in that file; discovery has separate CLI settling flags. See the [reference](docs/discovery.md#browser-and-evidence-options).

The public API includes `discoverUrl`, `discoverUrls`, `discoverSitemap`, `buildModel` and `writeDiscoveryReport`; all exports are in [src/index.ts](src/index.ts). Explicit JS/TS hooks support visit and form setup. Install the package in another Node.js project with `npm install github:mattlock83/web-discover`, then import it by name:

```ts
import { discoverUrl } from "web-discover";

const result = await discoverUrl("http://localhost:3000/", {
  output: "models/site.model.json",
  depth: 1,
});

console.log(result.inventory);
```

From this repository, run the type checks and regression tests with:

```bash
npm run check
npm test
npm run test:package
WEB_DISCOVER_BROWSER_TESTS=1 npm test
```

`test:package` verifies the packed CLI and API from an isolated installation. The opt-in browser tests need Chrome. GitHub Actions runs the regular checks, package smoke test and Chrome integration tests.
