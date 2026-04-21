/*
 * Copyright 2026 Patched Reality, Inc.
 * SPDX-License-Identifier: Apache-2.0
 *
 * Live integration test: exercises findEarthAttachmentParent against the real
 * RP1 Earth fabric. Hits cdn2.rp1.com, prod-map-earth.rp1.com, and Nominatim.
 * Opt-in via `npm run test:integration` (not part of the default test suite).
 *
 * Connects anonymously — no credentials needed for read-only traversal.
 * Set RP1_EARTH_FABRIC_URL to override the default fabric URL.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import './node/mv-loader.js';
import { ManifolderClient } from './ManifolderClient.js';

// The RP1 map hosts serve only the leaf TLS cert (browsers resolve intermediates
// via AIA; Node does not). Allow their WS connections anyway — the integration
// test is read-only and pinned to these hosts. Keys are bare hostnames because
// the loader matches against `new URL(url).host`, which strips the default port.
globalThis.__manifolderUnsafeHosts.add('prod-map.rp1.com');
globalThis.__manifolderUnsafeHosts.add('prod-map-earth.rp1.com');

const fabricUrl = process.env.RP1_EARTH_FABRIC_URL ?? 'https://cdn2.rp1.com/config/earth.msf';

test('findEarthAttachmentParent resolves Long Beach Convention Center on the RP1 Earth fabric', {
  timeout: 120000,
}, async () => {
  const client = new ManifolderClient();
  let scopeId = null;
  try {
    const connection = await client.connectRoot({ fabricUrl, timeoutMs: 90000 });
    scopeId = connection.scopeId;
    assert.ok(scopeId, 'connectRoot should return a scopeId');

    // Long Beach Convention & Entertainment Center — 300 E Ocean Blvd, Long Beach, CA
    const result = await client.findEarthAttachmentParent({
      scopeId,
      lat: 33.7625,
      lon: -118.1895,
      boundX: 200,
      boundZ: 200,
    });

    console.error('Resolved attachment:', {
      parent: result.parent?.name ?? null,
      candidateCount: result.candidates?.length ?? 0,
      geocode: result.geocode,
    });

    assert.ok(
      result.parent || (result.candidates?.length ?? 0) > 0,
      'Expected a parent or at least one candidate',
    );
    assert.equal(result.geocode.country, 'United States');
    assert.equal(result.geocode.state, 'California');
    assert.ok(Math.abs(result.attachment.latitude - 33.7625) < 0.01, 'latitude should round-trip');
    assert.ok(Math.abs(result.attachment.longitude - (-118.1895)) < 0.01, 'longitude should round-trip');
  } finally {
    if (scopeId) {
      await client.closeScope({ scopeId, cascade: true }).catch(() => {});
    }
  }
});
