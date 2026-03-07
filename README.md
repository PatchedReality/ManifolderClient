# ManifolderClient

ManifolderClient is a JavaScript library for connecting to MVMF-based
[Open Metaverse](https://omb.metaverse-standards.org/)
[Spatial Fabric](https://omb.metaverse-standards.org/en/spatial-fabric/architecture) servers.
It provides a shared client implementation used by both browser applications
and Node.js tools.

The library works in both browser environments (via `<script>` tags)
and Node.js runtimes (ES modules).

ManifolderClient is an open source project created and maintained by
[Patched Reality, Inc.](https://patchedreality.com).

## Related Projects

- **[Manifolder](https://github.com/PatchedReality/Manifolder)** — Web-based explorer for visualizing Open Metaverse fabrics
- **[ManifolderMCP](https://github.com/PatchedReality/ManifolderMCP)** — MCP server that exposes ManifolderClient functionality to AI agents

## Adding to a project

Add as a git submodule:

```bash
git submodule add https://github.com/PatchedReality/ManifolderClient.git path/to/ManifolderClient
```

Install peer dependencies in your project (Node.js only):

```bash
npm install socket.io-client ws
```

### Browser usage

Load the MVMF vendor libraries via `<script>` tags, then import the client as an ES module:

```html
<!-- Vendor libs (order matters) -->
<script src="path/to/ManifolderClient/vendor/mv/MVMF.js"></script>
<script src="path/to/ManifolderClient/vendor/mv/MVSB.js"></script>
<script src="path/to/ManifolderClient/vendor/mv/MVXP.js"></script>
<script src="path/to/ManifolderClient/vendor/mv/MVRest.js"></script>
<script src="path/to/ManifolderClient/vendor/mv/socket.io.min.js"></script>
<script src="path/to/ManifolderClient/vendor/mv/MVIO.js"></script>
<script src="path/to/ManifolderClient/vendor/mv/MVRP.js"></script>
<script src="path/to/ManifolderClient/vendor/mv/MVRP_Dev.js"></script>
<script src="path/to/ManifolderClient/vendor/mv/MVRP_Map.js"></script>
```

```javascript
import { createManifolderPromiseClient } from './path/to/ManifolderClient/ManifolderClient.js';

const client = createManifolderPromiseClient();
const root = await client.connectRoot({
  fabricUrl: 'https://example.com/fabric/fabric.msf',
  adminKey: '',
});
const scenes = await client.listScenes({ scopeId: root.scopeId });
```

### Node.js usage

Import the loader first (sets up browser API shims and loads vendor libs), then import the client:

```javascript
import './path/to/ManifolderClient/node/mv-loader.js';
import { createManifolderPromiseClient } from './path/to/ManifolderClient/ManifolderClient.js';
```

For servers with self-signed or incomplete SSL certificate chains, register hosts before connecting:

```javascript
globalThis.__manifolderUnsafeHosts.add('fabric-server.example.com');
```

SSL certificate errors are captured in `globalThis.__manifolderSSLErrors` (an array of host strings) for callers to surface in error messages.

## Updating vendor libraries

Run `scripts/sync-vendor.sh` to copy the latest MVMF libraries from SceneAssembler:

```bash
./scripts/sync-vendor.sh [path-to-SceneAssembler]
```

This copies all `MV*.js` files into `vendor/mv/` and appends `globalThis.MV = MV;` to `MVMF.js` (the only modification to vendor files). Commit the result and update the submodule pointer in consuming projects.

## Tests

```bash
npm test
```

## Structure

```
ManifolderClient.js          # Client library
ManifolderClient.d.ts        # TypeScript declarations
ManifolderClient.test.js     # Unit tests
node-helpers.js              # Shared utilities
types.ts                     # Type definitions (source)
types.js / types.d.ts        # Compiled types (committed)
vendor/mv/                   # MVMF vendor libraries
node/
  node-shim.js               # Browser API polyfills for Node.js
  mv-loader.js               # Loads shims + vendor libs, wraps io() with SSL bypass
scripts/
  sync-vendor.sh             # Sync vendor libs from SceneAssembler
```

## License

Licensed under the Apache License, Version 2.0.
See the [LICENSE](LICENSE) file for details.

## Attribution

This project uses the MVMF libraries developed by
[Metaversal Corporation](https://rp1.com/).

See the [NOTICE](NOTICE) file for full attribution details.

## Contributing

Contributions are welcome. By submitting a pull request, you agree that your
contribution will be licensed under the Apache License, Version 2.0.
