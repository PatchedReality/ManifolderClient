// Node.js loader for MVMF vendor libraries.
// Loads browser API shims, sets up socket.io-client with per-host SSL bypass,
// redirects console.log to stderr, and imports vendor libs in dependency order.

import './node-shim.js';

import { io as _io } from 'socket.io-client';

// Wrap io() to inject rejectUnauthorized:false for hosts registered as unsafe.
// Hosts are registered by callers (e.g. ManifolderMCP) via globalThis.__manifolderUnsafeHosts.
globalThis.__manifolderUnsafeHosts = globalThis.__manifolderUnsafeHosts || new Set();

globalThis.io = function io(url, opts) {
  opts = opts || {};
  try {
    const host = new URL(url).host;
    if (globalThis.__manifolderUnsafeHosts.has(host)) {
      opts.rejectUnauthorized = false;
    }
  } catch (_) {
    // Non-URL argument — pass through unchanged
  }
  return _io(url, opts);
};

// Redirect console.log to stderr (MVMF libraries use console.log which would corrupt MCP stdout)
console.log = (...args) => console.error(...args);

// Load MVMF libraries in dependency order (these attach to globalThis.MV)
import '../vendor/mv/MVMF.js';
import '../vendor/mv/MVSB.js';
import '../vendor/mv/MVXP.js';
import '../vendor/mv/MVIO.js';
import '../vendor/mv/MVRP.js';
import '../vendor/mv/MVRest.js';
import '../vendor/mv/MVRP_Dev.js';
import '../vendor/mv/MVRP_Map.js';

export const MV = globalThis.MV;
export default MV;
