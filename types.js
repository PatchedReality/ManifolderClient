/*
 * Copyright 2026 Patched Reality, Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectTypeMap = exports.ClassIdToPrefix = exports.ClassPrefixes = exports.ClassIds = void 0;
exports.parseObjectRef = parseObjectRef;
exports.formatObjectRef = formatObjectRef;
// MVMF Class IDs
exports.ClassIds = {
    RMRoot: 70,
    RMCObject: 71,
    RMTObject: 72,
    RMPObject: 73,
};
// Prefix mapping for class-prefixed object references
exports.ClassPrefixes = {
    root: 70,
    celestial: 71,
    terrestrial: 72,
    physical: 73,
};
exports.ClassIdToPrefix = {
    70: 'root',
    71: 'celestial',
    72: 'terrestrial',
    73: 'physical',
};
// Parse "terrestrial:3" → { classId: 72, numericId: 3 }, "root" → { classId: 70, numericId: 1 }
function parseObjectRef(ref) {
    if (ref === 'root') {
        return { classId: exports.ClassIds.RMRoot, numericId: 1 };
    }
    const colonIndex = ref.indexOf(':');
    if (colonIndex === -1) {
        throw new Error(`Invalid object reference "${ref}". Expected format: "class:id" (e.g., "physical:42", "terrestrial:3") or "root".`);
    }
    const prefix = ref.substring(0, colonIndex);
    const classId = exports.ClassPrefixes[prefix];
    if (classId === undefined) {
        throw new Error(`Unknown class prefix "${prefix}" in reference "${ref}". Valid prefixes: ${Object.keys(exports.ClassPrefixes).join(', ')}`);
    }
    const numericId = parseInt(ref.substring(colonIndex + 1), 10);
    if (isNaN(numericId)) {
        throw new Error(`Invalid numeric ID in reference "${ref}".`);
    }
    return { classId, numericId };
}
// Reverse of parseObjectRef: formatObjectRef(72, 3) → "terrestrial:3"
function formatObjectRef(classId, numericId) {
    const prefix = exports.ClassIdToPrefix[classId];
    if (!prefix) {
        throw new Error(`Unknown class ID ${classId}`);
    }
    if (classId === exports.ClassIds.RMRoot) {
        return 'root';
    }
    return `${prefix}:${numericId}`;
}
// ObjectTypeMap: maps "class:subtype" strings to { classId, bType }
exports.ObjectTypeMap = {
    // Celestial subtypes (class 71)
    'celestial:universe': { classId: 71, subtype: 1 },
    'celestial:supercluster': { classId: 71, subtype: 2 },
    'celestial:galaxy_cluster': { classId: 71, subtype: 3 },
    'celestial:galaxy': { classId: 71, subtype: 4 },
    'celestial:black_hole': { classId: 71, subtype: 5 },
    'celestial:nebula': { classId: 71, subtype: 6 },
    'celestial:star_cluster': { classId: 71, subtype: 7 },
    'celestial:constellation': { classId: 71, subtype: 8 },
    'celestial:star_system': { classId: 71, subtype: 9 },
    'celestial:star': { classId: 71, subtype: 10 },
    'celestial:planet_system': { classId: 71, subtype: 11 },
    'celestial:planet': { classId: 71, subtype: 12 },
    'celestial:moon': { classId: 71, subtype: 13 },
    'celestial:debris': { classId: 71, subtype: 14 },
    'celestial:satellite': { classId: 71, subtype: 15 },
    'celestial:transport': { classId: 71, subtype: 16 },
    'celestial:surface': { classId: 71, subtype: 17 },
    // Terrestrial subtypes (class 72)
    'terrestrial:root': { classId: 72, subtype: 1 },
    'terrestrial:water': { classId: 72, subtype: 2 },
    'terrestrial:land': { classId: 72, subtype: 3 },
    'terrestrial:country': { classId: 72, subtype: 4 },
    'terrestrial:territory': { classId: 72, subtype: 5 },
    'terrestrial:state': { classId: 72, subtype: 6 },
    'terrestrial:county': { classId: 72, subtype: 7 },
    'terrestrial:city': { classId: 72, subtype: 8 },
    'terrestrial:community': { classId: 72, subtype: 9 },
    'terrestrial:sector': { classId: 72, subtype: 10 },
    'terrestrial:parcel': { classId: 72, subtype: 11 },
    // Physical subtypes (class 73)
    'physical': { classId: 73, subtype: 0 },
    'physical:transport': { classId: 73, subtype: 1 },
};
