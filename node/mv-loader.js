/*
 * Copyright 2026 Patched Reality, Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

// Node.js loader for MVMF vendor libraries.
// Loads browser API shims, sets up socket.io-client,
// redirects console.log to stderr, and imports vendor libs in dependency order.

import './node-shim.js';

import { io as _io } from 'socket.io-client';

// Per-host SSL bypass set — initialized here, populated by callers (e.g. ManifolderMCP)
// before connecting. MVIO uses socket.io-client (via globalThis.io) with websocket
// transport, so rejectUnauthorized must be injected into the io() options.
globalThis.__manifolderUnsafeHosts = globalThis.__manifolderUnsafeHosts || new Set();

globalThis.io = function io(url, opts) {
  opts = opts || {};
  const unsafeHosts = globalThis.__manifolderUnsafeHosts;
  if (unsafeHosts?.size) {
    try {
      const host = new URL(url).host;
      if (unsafeHosts.has(host)) {
        opts.rejectUnauthorized = false;
      }
    } catch (_) {}
  }
  const socket = _io(url, opts);
  socket.on('connect_error', (err) => {
    // socket.io wraps transport errors: SSL info is in err.description.message
    const desc = err?.description?.message || '';
    if (desc.includes('certificate') || desc.includes('UNABLE_TO_VERIFY')) {
      let host = '';
      try { host = new URL(url).host; } catch (_) { host = url; }
      globalThis.__manifolderSSLErrors = globalThis.__manifolderSSLErrors || [];
      if (!globalThis.__manifolderSSLErrors.includes(host)) {
        globalThis.__manifolderSSLErrors.push(host);
      }
    }
  });
  return socket;
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
