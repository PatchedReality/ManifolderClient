/*
 * Copyright 2026 Patched Reality, Inc.
 * SPDX-License-Identifier: Apache-2.0
 */

// Unified Manifolder client for both browser and Node runtimes.
// Assumes globalThis.MV is initialized by host project bootstrap code.
import { getMsfReference } from './node-helpers.js';
/** @typedef {import('./types.js').BulkOperation} BulkOperation */
/** @typedef {import('./types.js').ConnectionStatus} ConnectionStatus */
/** @typedef {import('./types.js').ConnectRootParams} ConnectRootParams */
/** @typedef {import('./types.js').CreateObjectParams} CreateObjectParams */
/** @typedef {import('./types.js').FabricObject} FabricObject */
/** @typedef {import('./types.js').FabricScopeId} FabricScopeId */
/** @typedef {import('./types.js').FindEarthAttachmentParentParams} FindEarthAttachmentParentParams */
/** @typedef {import('./types.js').FollowAttachmentParams} FollowAttachmentParams */
/** @typedef {import('./types.js').FollowAttachmentResult} FollowAttachmentResult */
/** @typedef {import('./types.js').NodeUid} NodeUid */
/** @typedef {import('./types.js').ObjectFilter} ObjectFilter */
/** @typedef {import('./types.js').EarthAttachmentParentResult} EarthAttachmentParentResult */
/** @typedef {import('./types.js').Scene} Scene */
/** @typedef {import('./types.js').SearchQuery} SearchQuery */
/** @typedef {import('./types.js').ScopeInfo} ScopeInfo */
/** @typedef {import('./types.js').ScopeStatus} ScopeStatus */
/** @typedef {import('./types.js').UpdateObjectParams} UpdateObjectParams */
/**
 * @typedef {object} ConnectOptions
 * @property {string} [adminKey]
 * @property {number} [timeoutMs]
 */
/** @typedef {'connected' | 'disconnected' | 'error' | 'status' | 'mapData' | 'nodeInserted' | 'nodeUpdated' | 'nodeDeleted' | 'modelReady'} ClientEvent */
/** @typedef {(data: any) => void} ClientEventHandler */
/** @typedef {{ sID: string; twObjectIx: number }} ModelRef */
/** @typedef {{ matches: any[]; paths: any[]; unavailable: string[] }} SearchNodesResult */
function debugLog(_msg) { }
const ClassIds = {
    RMRoot: 70,
    RMCObject: 71,
    RMTObject: 72,
    RMPObject: 73,
};
const ClassPrefixes = {
    root: 70,
    celestial: 71,
    terrestrial: 72,
    physical: 73,
};
const ClassIdToPrefix = {
    70: 'root',
    71: 'celestial',
    72: 'terrestrial',
    73: 'physical',
};
function parseObjectRef(ref) {
    if (ref === 'root') {
        return { classId: ClassIds.RMRoot, numericId: 1 };
    }
    const colonIndex = ref.indexOf(':');
    if (colonIndex === -1) {
        throw new Error(`Invalid object reference "${ref}". Expected format: "class:id" or "root".`);
    }
    const prefix = ref.substring(0, colonIndex);
    const classId = ClassPrefixes[prefix];
    if (classId === undefined) {
        throw new Error(`Unknown class prefix "${prefix}" in reference "${ref}".`);
    }
    const numericId = Number.parseInt(ref.substring(colonIndex + 1), 10);
    if (Number.isNaN(numericId)) {
        throw new Error(`Invalid numeric ID in reference "${ref}".`);
    }
    return { classId, numericId };
}
function formatObjectRef(classId, numericId) {
    const prefix = ClassIdToPrefix[classId];
    if (!prefix) {
        throw new Error(`Unknown class ID ${classId}`);
    }
    if (classId === ClassIds.RMRoot) {
        return 'root';
    }
    return `${prefix}:${numericId}`;
}
const ObjectTypeMap = {
    'celestial:universe': { classId: 71, type: 1 },
    'celestial:supercluster': { classId: 71, type: 2 },
    'celestial:galaxy_cluster': { classId: 71, type: 3 },
    'celestial:galaxy': { classId: 71, type: 4 },
    'celestial:black_hole': { classId: 71, type: 5 },
    'celestial:nebula': { classId: 71, type: 6 },
    'celestial:star_cluster': { classId: 71, type: 7 },
    'celestial:constellation': { classId: 71, type: 8 },
    'celestial:star_system': { classId: 71, type: 9 },
    'celestial:star': { classId: 71, type: 10 },
    'celestial:planet_system': { classId: 71, type: 11 },
    'celestial:planet': { classId: 71, type: 12 },
    'celestial:moon': { classId: 71, type: 13 },
    'celestial:debris': { classId: 71, type: 14 },
    'celestial:satellite': { classId: 71, type: 15 },
    'celestial:transport': { classId: 71, type: 16 },
    'celestial:surface': { classId: 71, type: 17 },
    'terrestrial:root': { classId: 72, type: 1 },
    'terrestrial:water': { classId: 72, type: 2 },
    'terrestrial:land': { classId: 72, type: 3 },
    'terrestrial:country': { classId: 72, type: 4 },
    'terrestrial:territory': { classId: 72, type: 5 },
    'terrestrial:state': { classId: 72, type: 6 },
    'terrestrial:county': { classId: 72, type: 7 },
    'terrestrial:city': { classId: 72, type: 8 },
    'terrestrial:community': { classId: 72, type: 9 },
    'terrestrial:sector': { classId: 72, type: 10 },
    'terrestrial:parcel': { classId: 72, type: 11 },
    'physical:default': { classId: 73, type: 0 },
    'physical:transport': { classId: 73, type: 1 },
};
// Class-aware action lookups
const CLASS_ID_TO_OPEN_ACTION = {
    [ClassIds.RMCObject]: { action: 'RMCOBJECT_OPEN', nameField: 'wsRMCObjectId', resultField: 'twRMCObjectIx' },
    [ClassIds.RMTObject]: { action: 'RMTOBJECT_OPEN', nameField: 'wsRMTObjectId', resultField: 'twRMTObjectIx' },
    [ClassIds.RMPObject]: { action: 'RMPOBJECT_OPEN', nameField: 'wsRMPObjectId', resultField: 'twRMPObjectIx' },
};
const CLASS_ID_TO_CLOSE_ACTION = {
    [ClassIds.RMCObject]: { action: 'RMCOBJECT_CLOSE', idField: 'twRMCObjectIx_Close' },
    [ClassIds.RMTObject]: { action: 'RMTOBJECT_CLOSE', idField: 'twRMTObjectIx_Close' },
    [ClassIds.RMPObject]: { action: 'RMPOBJECT_CLOSE', idField: 'twRMPObjectIx_Close' },
};
const CLASS_ID_TO_NAME_FIELD = {
    [ClassIds.RMCObject]: 'wsRMCObjectId',
    [ClassIds.RMTObject]: 'wsRMTObjectId',
    [ClassIds.RMPObject]: 'wsRMPObjectId',
};
const BASELINE_REQUIRE_LIST = 'MVRP_Dev,MVRP_Map';
const EARTH_RADIUS_METERS = 6371000;
const NOMINATIM_TIMEOUT_MS = 5000;
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';
const REVERSE_OBJECT_TYPE_MAP = Object.fromEntries(Object.entries(ObjectTypeMap).map(([key, value]) => [`${value.classId}:${value.type}`, key]));
const TERRESTRIAL_GEO_FIELDS = ['country', 'state', 'county', 'city', 'community'];
const SECTOR_SUBTYPE_RULES = [
    { minDiameterKm: 50, subtype: 0, height: 1000, depth: 1000 },
    { minDiameterKm: 5, subtype: 1, height: 750, depth: 750 },
    { minDiameterKm: 0.5, subtype: 2, height: 500, depth: 500 },
    { minDiameterKm: 0.1, subtype: 3, height: 250, depth: 250 },
];
function toRadians(value) {
    return value * Math.PI / 180;
}
function toDegrees(value) {
    return value * 180 / Math.PI;
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function normalizeLongitude(longitude) {
    let normalized = longitude;
    while (normalized > 180) {
        normalized -= 360;
    }
    while (normalized < -180) {
        normalized += 360;
    }
    return normalized;
}
function formatObjectTypeName(classId, type, subtype = 0) {
    const base = REVERSE_OBJECT_TYPE_MAP[`${classId}:${type}`] ?? `${ClassIdToPrefix[classId] ?? `class${classId}`}:type${type}`;
    if (subtype === 255) {
        return `${base}:attachment`;
    }
    if (subtype > 0) {
        return `${base}:${subtype}`;
    }
    return base;
}
function latLonToWorldCoords(lat, lon, radius) {
    const latRad = toRadians(lat);
    const lonRad = toRadians(lon);
    return {
        x: radius * Math.cos(latRad) * Math.sin(lonRad),
        y: radius * Math.sin(latRad),
        z: radius * Math.cos(latRad) * Math.cos(lonRad),
    };
}
function worldCoordsToLatLon(position, radius) {
    const length = Math.sqrt((position.x ** 2) + (position.y ** 2) + (position.z ** 2));
    const effectiveRadius = length === 0 ? radius : length;
    return {
        latitude: toDegrees(Math.asin(clamp(position.y / effectiveRadius, -1, 1))),
        longitude: toDegrees(Math.atan2(position.x, position.z)),
    };
}
function invertMatrix(matrix) {
    const d00 = matrix.d00;
    const d01 = matrix.d01;
    const d02 = matrix.d02;
    const d03 = matrix.d03;
    const d10 = matrix.d10;
    const d11 = matrix.d11;
    const d12 = matrix.d12;
    const d13 = matrix.d13;
    const d20 = matrix.d20;
    const d21 = matrix.d21;
    const d22 = matrix.d22;
    const d23 = matrix.d23;
    const d30 = matrix.d30;
    const d31 = matrix.d31;
    const d32 = matrix.d32;
    const d33 = matrix.d33;
    const s0 = d00 * d11 - d10 * d01;
    const s1 = d00 * d12 - d10 * d02;
    const s2 = d00 * d13 - d10 * d03;
    const s3 = d01 * d12 - d11 * d02;
    const s4 = d01 * d13 - d11 * d03;
    const s5 = d02 * d13 - d12 * d03;
    const c5 = d22 * d33 - d32 * d23;
    const c4 = d21 * d33 - d31 * d23;
    const c3 = d21 * d32 - d31 * d22;
    const c2 = d20 * d33 - d30 * d23;
    const c1 = d20 * d32 - d30 * d22;
    const c0 = d20 * d31 - d30 * d21;
    const determinant = s0 * c5 - s1 * c4 + s2 * c3 + s3 * c2 - s4 * c1 + s5 * c0;
    if (determinant === 0) {
        throw new Error('Unable to invert singular geo matrix');
    }
    const inv = 1 / determinant;
    return {
        d00: (d11 * c5 - d12 * c4 + d13 * c3) * inv,
        d01: (-d01 * c5 + d02 * c4 - d03 * c3) * inv,
        d02: (d31 * s5 - d32 * s4 + d33 * s3) * inv,
        d03: (-d21 * s5 + d22 * s4 - d23 * s3) * inv,
        d10: (-d10 * c5 + d12 * c2 - d13 * c1) * inv,
        d11: (d00 * c5 - d02 * c2 + d03 * c1) * inv,
        d12: (-d30 * s5 + d32 * s2 - d33 * s1) * inv,
        d13: (d20 * s5 - d22 * s2 + d23 * s1) * inv,
        d20: (d10 * c4 - d11 * c2 + d13 * c0) * inv,
        d21: (-d00 * c4 + d01 * c2 - d03 * c0) * inv,
        d22: (d30 * s4 - d31 * s2 + d33 * s0) * inv,
        d23: (-d20 * s4 + d21 * s2 - d23 * s0) * inv,
        d30: (-d10 * c3 + d11 * c1 - d12 * c0) * inv,
        d31: (d00 * c3 - d01 * c1 + d02 * c0) * inv,
        d32: (-d30 * s3 + d31 * s1 - d32 * s0) * inv,
        d33: (d20 * s3 - d21 * s1 + d22 * s0) * inv,
    };
}
function buildGeoMatrix(lat, lon, radius) {
    const dLatX = toRadians(90 - lat);
    const dLat = toRadians(lat);
    const dLon = toRadians(lon);
    let dRad = radius;
    let dOI = 1;
    if (dRad < 0) {
        dRad *= -1;
        dOI *= -1;
    }
    const dCLatX = Math.cos(dLatX);
    const dSLatX = Math.sin(dLatX);
    const dCLat = Math.cos(dLat);
    const dSLat = Math.sin(dLat);
    const dCLon = Math.cos(dLon);
    const dSLon = Math.sin(dLon);
    const forward = {
        d00: dOI * dCLon,
        d01: dOI * dSLon * dSLatX,
        d02: dSLon * dCLatX,
        d03: dRad * dCLat * dSLon,
        d10: 0,
        d11: dOI * dCLatX,
        d12: -dSLatX,
        d13: dRad * dSLat,
        d20: dOI * -dSLon,
        d21: dOI * dCLon * dSLatX,
        d22: dCLon * dCLatX,
        d23: dRad * dCLat * dCLon,
        d30: 0,
        d31: 0,
        d32: 0,
        d33: 1,
    };
    return { forward, inverse: invertMatrix(forward) };
}
function transformPoint(matrix, point) {
    return {
        x: (matrix.d00 * point.x) + (matrix.d01 * point.y) + (matrix.d02 * point.z) + matrix.d03,
        y: (matrix.d10 * point.x) + (matrix.d11 * point.y) + (matrix.d12 * point.z) + matrix.d13,
        z: (matrix.d20 * point.x) + (matrix.d21 * point.y) + (matrix.d22 * point.z) + matrix.d23,
    };
}
function composeMatrixFromTransform(pos, rot, scale) {
    const x = rot.x, y = rot.y, z = rot.z, w = rot.w;
    const sx = scale.x, sy = scale.y, sz = scale.z;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;
    return {
        d00: (1 - (yy + zz)) * sx, d01: (xy - wz) * sy, d02: (xz + wy) * sz, d03: pos.x,
        d10: (xy + wz) * sx, d11: (1 - (xx + zz)) * sy, d12: (yz - wx) * sz, d13: pos.y,
        d20: (xz - wy) * sx, d21: (yz + wx) * sy, d22: (1 - (xx + yy)) * sz, d23: pos.z,
        d30: 0, d31: 0, d32: 0, d33: 1,
    };
}
function multiplyMatrices(a, b) {
    return {
        d00: a.d00 * b.d00 + a.d01 * b.d10 + a.d02 * b.d20 + a.d03 * b.d30,
        d01: a.d00 * b.d01 + a.d01 * b.d11 + a.d02 * b.d21 + a.d03 * b.d31,
        d02: a.d00 * b.d02 + a.d01 * b.d12 + a.d02 * b.d22 + a.d03 * b.d32,
        d03: a.d00 * b.d03 + a.d01 * b.d13 + a.d02 * b.d23 + a.d03 * b.d33,
        d10: a.d10 * b.d00 + a.d11 * b.d10 + a.d12 * b.d20 + a.d13 * b.d30,
        d11: a.d10 * b.d01 + a.d11 * b.d11 + a.d12 * b.d21 + a.d13 * b.d31,
        d12: a.d10 * b.d02 + a.d11 * b.d12 + a.d12 * b.d22 + a.d13 * b.d32,
        d13: a.d10 * b.d03 + a.d11 * b.d13 + a.d12 * b.d23 + a.d13 * b.d33,
        d20: a.d20 * b.d00 + a.d21 * b.d10 + a.d22 * b.d20 + a.d23 * b.d30,
        d21: a.d20 * b.d01 + a.d21 * b.d11 + a.d22 * b.d21 + a.d23 * b.d31,
        d22: a.d20 * b.d02 + a.d21 * b.d12 + a.d22 * b.d22 + a.d23 * b.d32,
        d23: a.d20 * b.d03 + a.d21 * b.d13 + a.d22 * b.d23 + a.d23 * b.d33,
        d30: a.d30 * b.d00 + a.d31 * b.d10 + a.d32 * b.d20 + a.d33 * b.d30,
        d31: a.d30 * b.d01 + a.d31 * b.d11 + a.d32 * b.d21 + a.d33 * b.d31,
        d32: a.d30 * b.d02 + a.d31 * b.d12 + a.d32 * b.d22 + a.d33 * b.d32,
        d33: a.d30 * b.d03 + a.d31 * b.d13 + a.d32 * b.d23 + a.d33 * b.d33,
    };
}
function objectToRelativeMatrix(obj) {
    const t = obj.transform ?? {};
    return composeMatrixFromTransform(
        t.position ?? { x: 0, y: 0, z: 0 },
        t.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
        t.scale ?? { x: 1, y: 1, z: 1 },
    );
}
export function pointInLocalBounds(localPoint, bound) {
    if (!bound) {
        return false;
    }
    return Math.abs(localPoint.x) <= bound.x &&
        Math.abs(localPoint.y) <= bound.y &&
        Math.abs(localPoint.z) <= bound.z;
}
export function campusFitsInLocalBounds(localPoint, campusBound, nodeBound) {
    if (!nodeBound) {
        return false;
    }
    return Math.abs(localPoint.x) + campusBound.x <= nodeBound.x &&
        Math.abs(localPoint.y) + campusBound.y <= nodeBound.y &&
        Math.abs(localPoint.z) + campusBound.z <= nodeBound.z;
}
function computeSectorBounds(halfX, halfZ, height, depth, radius) {
    const boundX = halfX * (radius + height) / radius * 2;
    const boundZ = halfZ * (radius + height) / radius * 2;
    const maxHalf = Math.max(halfX, halfZ);
    const scaledHalf = maxHalf * (radius - depth) / radius;
    const adjustedRadius = Math.sqrt(Math.max(0, ((radius - depth) * (radius - depth)) - (scaledHalf * scaledHalf)));
    const boundY = radius + height - adjustedRadius;
    return { boundX, boundY, boundZ, adjustedRadius };
}
function computeChildMatrices(childObj, parentWorldMatrix) {
    const childRelative = objectToRelativeMatrix(childObj);
    const worldMatrix = multiplyMatrices(parentWorldMatrix, childRelative);
    return { worldMatrix, inverseWorldMatrix: invertMatrix(worldMatrix) };
}
function getSectorSubtypeRule(diameterKm) {
    for (const rule of SECTOR_SUBTYPE_RULES) {
        if (diameterKm >= rule.minDiameterKm) {
            return rule;
        }
    }
    throw new Error('Diameter must be at least 0.1 km');
}
function hasCampusSize(nodeBound, campusBound) {
    return !!nodeBound && campusBound.x <= nodeBound.x && campusBound.y <= nodeBound.y && campusBound.z <= nodeBound.z;
}
function getBoundArea(bound) {
    if (!bound) {
        return Number.POSITIVE_INFINITY;
    }
    return bound.x * bound.z;
}
function toAttachmentParentInfo(object) {
    return {
        objectId: object.id,
        name: object.name,
        objectType: formatObjectTypeName(object.classId, object.type, object.subtype),
        bound: object.bound ?? { x: 0, y: 0, z: 0 },
    };
}
function normalizeSearchName(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function mergeResolvedGeocode(reverseGeocode) {
    return reverseGeocode ?? {};
}
function buildPreferredPathIds(result) {
    const sortedAncestors = [...(result?.ancestry ?? [])]
        .sort((a, b) => (b.ancestorDepth ?? 0) - (a.ancestorDepth ?? 0))
        .map((ancestor) => ancestor.objectId)
        .filter(Boolean);
    if (result?.object?.id) {
        sortedAncestors.push(result.object.id);
    }
    return sortedAncestors;
}
function normalizeVector(vec) {
    const magnitude = Math.hypot(vec?.x ?? 0, vec?.y ?? 0, vec?.z ?? 0);
    if (!Number.isFinite(magnitude) || magnitude === 0) {
        return null;
    }
    return {
        x: vec.x / magnitude,
        y: vec.y / magnitude,
        z: vec.z / magnitude,
    };
}
function computeSurfaceArcDistanceMeters(a, b, radius = EARTH_RADIUS_METERS) {
    const normA = normalizeVector(a);
    const normB = normalizeVector(b);
    if (!normA || !normB) {
        return Number.POSITIVE_INFINITY;
    }
    const dot = Math.max(-1, Math.min(1, normA.x * normB.x + normA.y * normB.y + normA.z * normB.z));
    return Math.acos(dot) * radius;
}
function worldPosFromMatrix(matrix) {
    return { x: matrix.d03, y: matrix.d13, z: matrix.d23 };
}
function sortContainingEntriesBySurfaceDistance(entries, campusWorldPos, preferredPathOrder) {
    entries.sort((a, b) => {
        const aWorldPos = worldPosFromMatrix(a.worldMatrix);
        const bWorldPos = worldPosFromMatrix(b.worldMatrix);
        const aDistance = computeSurfaceArcDistanceMeters(aWorldPos, campusWorldPos);
        const bDistance = computeSurfaceArcDistanceMeters(bWorldPos, campusWorldPos);
        if (aDistance !== bDistance) {
            return aDistance - bDistance;
        }
        const aRank = preferredPathOrder.get(a.object.id) ?? Number.POSITIVE_INFINITY;
        const bRank = preferredPathOrder.get(b.object.id) ?? Number.POSITIVE_INFINITY;
        if (aRank !== bRank) {
            return aRank - bRank;
        }
        return getBoundArea(a.object.bound) - getBoundArea(b.object.bound);
    });
}
function buildAncestorMap(rows) {
    const ancestryByOrder = new Map();
    for (const row of rows ?? []) {
        const order = Number.isInteger(row?.nOrder) ? row.nOrder : 0;
        const item = {
            objectId: formatObjectRef(row.ObjectHead_wClass_Object, row.ObjectHead_twObjectIx),
            name: row.Name_wsRMCObjectId || row.Name_wsRMTObjectId || '',
            classId: row.ObjectHead_wClass_Object,
            type: row.Type_bType ?? 0,
            subtype: row.Type_bSubtype ?? 0,
            parentId: row.ObjectHead_wClass_Parent && row.ObjectHead_twParentIx
                ? formatObjectRef(row.ObjectHead_wClass_Parent, row.ObjectHead_twParentIx)
                : null,
            ancestorDepth: row.nAncestor ?? 0,
        };
        if (!ancestryByOrder.has(order)) {
            ancestryByOrder.set(order, []);
        }
        ancestryByOrder.get(order).push(item);
    }
    for (const items of ancestryByOrder.values()) {
        items.sort((a, b) => (b.ancestorDepth ?? 0) - (a.ancestorDepth ?? 0));
    }
    return ancestryByOrder;
}

/**
 * Normalize a fabric URL to a canonical form used for deterministic scope IDs.
 * @param {string} url
 * @returns {string}
 */
export function normalizeUrl(url) {
    const parsed = new URL(url);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    const isDefaultHttpPort = parsed.protocol === 'http:' && parsed.port === '80';
    const isDefaultHttpsPort = parsed.protocol === 'https:' && parsed.port === '443';
    if (isDefaultHttpPort || isDefaultHttpsPort) {
        parsed.port = '';
    }
    const normalizedPath = parsed.pathname
        .replace(/\/{2,}/g, '/')
        .replace(/\/+$/, '');
    parsed.pathname = normalizedPath.length > 0 ? normalizedPath : '/';
    parsed.hash = '';
    const host = parsed.port
        ? `${parsed.hostname}:${parsed.port}`
        : parsed.hostname;
    return `${parsed.protocol}//${host}${parsed.pathname}${parsed.search}`;
}

/**
 * @param {string} input
 * @returns {Promise<string>}
 */
async function sha256Hex(input) {
    const isNode = typeof process !== 'undefined'
        && !!process.versions?.node
        && typeof window === 'undefined';
    if (isNode) {
        const dynamicImport = new Function('specifier', 'return import(specifier)');
        const nodeCrypto = await dynamicImport('node:crypto');
        return nodeCrypto.createHash('sha256').update(input, 'utf8').digest('hex');
    }
    if (!globalThis.crypto?.subtle) {
        throw new Error('crypto.subtle is not available for scope ID generation');
    }
    const bytes = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    const view = new Uint8Array(digest);
    let hex = '';
    for (const value of view) {
        hex += value.toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * @param {string} normalizedInput
 * @returns {Promise<FabricScopeId>}
 */
export async function computeScopeId(normalizedInput) {
    const hex = await sha256Hex(normalizedInput);
    return `1_${hex.slice(0, 16)}`;
}

/**
 * @param {string} fabricUrl
 * @returns {Promise<FabricScopeId>}
 */
export async function computeRootScopeId(fabricUrl) {
    return computeScopeId(normalizeUrl(fabricUrl));
}

/**
 * @param {NodeUid} parentNodeUid
 * @param {string} childFabricUrl
 * @returns {Promise<FabricScopeId>}
 */
export async function computeChildScopeId(parentNodeUid, childFabricUrl) {
    return computeScopeId(`${parentNodeUid}|${normalizeUrl(childFabricUrl)}`);
}

/**
 * @param {FabricScopeId} scopeId
 * @param {number} classId
 * @param {number} numericId
 * @returns {NodeUid}
 */
export function computeNodeUid(scopeId, classId, numericId) {
    const prefix = ClassIdToPrefix[classId];
    if (!prefix) {
        throw new Error(`Unknown class ID ${classId}`);
    }
    return `${scopeId}:${prefix}:${numericId}`;
}

export class SingleScopeClient extends MV.MVMF.NOTIFICATION {
    static eSTATE = {
        NOTREADY: 0,
        LOADING: 1,
        READY: 4,
    };
    pFabric = null;
    pLnG = null;
    pRMRoot = null;
    connected = false;
    loggedIn = false;
    fabricUrl = null;
    currentSceneId = null;
    adminKey = null;
    loginAttempted = false;
    // Cache keyed by prefixed ID (e.g., "physical:42", "terrestrial:3")
    objectCache = new Map();
    pendingReady = new Map();
    attachedObjects = new Set();
    connectResolve = null;
    connectReject = null;
    connectionGeneration = 0;
    sceneWClass = null;
    sceneObjectIx = null;
    callbacks = {
        connected: [],
        disconnected: [],
        error: [],
        status: [],
        mapData: [],
        nodeInserted: [],
        nodeUpdated: [],
        nodeDeleted: [],
        modelReady: [],
    };
    searchableRMCObjectIndices = [];
    searchableRMTObjectIndices = [];
    rootReadyEmitted = false;
    pendingMutationWaits = new Set();
    recentMutationEvents = [];
    promiseTimeoutMs = 5000;
    isDisconnecting = false;
    bootstrapRequireHandle = null;
    IsReady() {
        return this.ReadyState?.() === SingleScopeClient.eSTATE.READY;
    }
    _acquireBootstrapRequirements() {
        if (this.bootstrapRequireHandle) {
            return;
        }
        const core = MV?.MVMF?.Core;
        if (!core?.Require || !core?.Release) {
            throw new Error('MVMF core Require/Release APIs are unavailable');
        }
        const requireHandle = core.Require(BASELINE_REQUIRE_LIST);
        if (!requireHandle) {
            throw new Error(`Failed to require baseline plugins: ${BASELINE_REQUIRE_LIST}`);
        }
        this.bootstrapRequireHandle = requireHandle;
    }
    _releaseBootstrapRequirements() {
        if (!this.bootstrapRequireHandle) {
            return;
        }
        const core = MV?.MVMF?.Core;
        if (core?.Release) {
            try {
                core.Release(this.bootstrapRequireHandle);
            }
            catch {
                // Ignore release errors during teardown.
            }
        }
        this.bootstrapRequireHandle = null;
    }
    getObjectName(pObject) {
        return pObject.pName?.wsRMPObjectId
            || pObject.pName?.wsRMTObjectId
            || pObject.pName?.wsRMCObjectId
            || `Object ${pObject.twObjectIx}`;
    }
    getObjectKey(pObject) {
        return `${pObject.wClass_Object || pObject.sID || 'unknown'}:${pObject.twObjectIx || 0}`;
    }
    getPrefixedId(pObject) {
        return formatObjectRef(pObject.wClass_Object, pObject.twObjectIx);
    }
    _isChildOf(parent, child) {
        if (!parent?.Child_Enum || !parent.IsReady?.()) {
            return null;
        }
        const cpChild = parent.acpChild?.[child.sID];
        if (!cpChild || cpChild.Length() === 0) {
            return null;
        }
        let found = false;
        parent.Child_Enum(child.sID, this, (c) => {
            if (c.twObjectIx === child.twObjectIx) {
                found = true;
            }
        }, null);
        return found;
    }
    _pruneMutationEvents() {
        const cutoff = Date.now() - 60000;
        while (this.recentMutationEvents.length > 0 && this.recentMutationEvents[0].timestamp < cutoff) {
            this.recentMutationEvents.shift();
        }
    }
    _recordMutationEvent(event) {
        const stampedEvent = {
            ...event,
            timestamp: Date.now(),
        };
        this.recentMutationEvents.push(stampedEvent);
        this._pruneMutationEvents();
        for (const wait of Array.from(this.pendingMutationWaits)) {
            if (stampedEvent.timestamp < (wait.minTimestamp ?? 0)) {
                continue;
            }
            let matched = false;
            try {
                matched = wait.matchFn(stampedEvent);
            }
            catch {
                matched = false;
            }
            if (matched) {
                clearTimeout(wait.timeoutId);
                this.pendingMutationWaits.delete(wait);
                wait.resolve(stampedEvent);
            }
        }
    }
    _createMutationWait(matchFn, description, timeoutMs = this.promiseTimeoutMs, minTimestamp = 0) {
        const findRecentMatch = () => {
            for (let i = this.recentMutationEvents.length - 1; i >= 0; i -= 1) {
                const event = this.recentMutationEvents[i];
                if (event.timestamp < minTimestamp) {
                    continue;
                }
                let matched = false;
                try {
                    matched = matchFn(event);
                }
                catch {
                    matched = false;
                }
                if (matched) {
                    return event;
                }
            }
            return null;
        };
        this._pruneMutationEvents();
        const immediateMatch = findRecentMatch();
        if (immediateMatch) {
            return {
                promise: Promise.resolve(immediateMatch),
                cancel: () => { },
            };
        }
        let wait;
        const promise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (wait) {
                    this.pendingMutationWaits.delete(wait);
                }
                const err = new Error(`Timeout waiting for mutation notification: ${description}`);
                err.code = 'MUTATION_TIMEOUT';
                reject(err);
            }, timeoutMs);
            wait = { matchFn, resolve, reject, timeoutId, minTimestamp };
            this.pendingMutationWaits.add(wait);
            // Re-check after registration to avoid edge-case race windows.
            const lateMatch = findRecentMatch();
            if (lateMatch) {
                clearTimeout(wait.timeoutId);
                this.pendingMutationWaits.delete(wait);
                resolve(lateMatch);
            }
        });
        const cancel = () => {
            if (wait && this.pendingMutationWaits.has(wait)) {
                clearTimeout(wait.timeoutId);
                this.pendingMutationWaits.delete(wait);
            }
        };
        return { promise, cancel };
    }
    async _confirmMutation(matchFn, description, timeoutMs = this.promiseTimeoutMs, minTimestamp = 0, tolerateTimeout = false) {
        const wait = this._createMutationWait(matchFn, description, timeoutMs, minTimestamp);
        try {
            await wait.promise;
            return { confirmed: true };
        }
        catch (err) {
            if (tolerateTimeout && err.code === 'MUTATION_TIMEOUT') {
                debugLog(`[_confirmMutation] timeout tolerated for: ${description}`);
                return { confirmed: false, timeout: true };
            }
            throw err;
        }
        finally {
            wait.cancel();
        }
    }
    waitForReady(pObject, timeoutMs = this.promiseTimeoutMs) {
        if (pObject.IsReady()) {
            return Promise.resolve();
        }
        if (pObject.ReadyState?.() === pObject.eSTATE?.ERROR) {
            return Promise.reject(new Error('Object in error state'));
        }
        const key = this.getObjectKey(pObject);
        debugLog(`[waitForReady] registering key=${key} sID=${pObject.sID} wClass=${pObject.wClass_Object} twObj=${pObject.twObjectIx}`);
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingReady.delete(key);
                debugLog(`[waitForReady] TIMEOUT key=${key}`);
                reject(new Error(`Timeout waiting for object to be ready (key: ${key}, state: ${pObject.ReadyState?.()})`));
            }, timeoutMs);
            this.pendingReady.set(key, {
                resolve: () => { clearTimeout(timeoutId); resolve(); },
                reject: (err) => { clearTimeout(timeoutId); reject(err); }
            });
        });
    }
    onReadyState(pNotice) {
        try {
            if (this.isDisconnecting) {
                return;
            }
            this.handleReadyState(pNotice);
            const pObject = pNotice.pCreator;
            if (!pObject)
                return;
            const key = this.getObjectKey(pObject);
            const isReady = pObject.IsReady?.();
            const state = pObject.ReadyState?.();
            debugLog(`[onReadyState] key=${key} isReady=${isReady} state=${state} sID=${pObject.sID} wClass=${pObject.wClass_Object} twObj=${pObject.twObjectIx} pendingKeys=[${[...this.pendingReady.keys()].join(',')}]`);
            const pending = this.pendingReady.get(key);
            if (pending) {
                if (isReady) {
                    this.pendingReady.delete(key);
                    pending.resolve();
                }
                else if (state === pObject.eSTATE?.ERROR) {
                    this.pendingReady.delete(key);
                    pending.reject(new Error('Object failed to load'));
                }
            }
            if (isReady && this.attachedObjects.has(pObject)) {
                this._emit('modelReady', { mvmfModel: pObject });
                if (pObject === this.pRMRoot && !this.rootReadyEmitted) {
                    this.rootReadyEmitted = true;
                    this.ReadyState?.(SingleScopeClient.eSTATE.READY);
                    this._collectSearchableIndices(pObject);
                    this._emit('status', 'Map loaded');
                    this._emit('mapData', pObject);
                }
            }
        }
        catch (err) {
            debugLog(`[onReadyState] ERROR: ${err.message}`);
            this._emit('error', err);
        }
    }
    onInserted(pNotice) {
        try {
            if (this.isDisconnecting) {
                return;
            }
            const pChild = pNotice.pData?.pChild;
            const pParent = pNotice.pCreator;
            debugLog(`[onInserted] parent=${pParent?.twObjectIx} parentClass=${pParent?.wClass_Object} child=${pChild?.twObjectIx} childClass=${pChild?.wClass_Object} childName=${pChild?.pName?.wsRMPObjectId || pChild?.pName?.wsRMTObjectId || pChild?.pName?.wsRMCObjectId}`);
            if (pChild?.twObjectIx && pChild?.wClass_Object) {
                const prefixedId = this.getPrefixedId(pChild);
                this.objectCache.set(prefixedId, pChild);
                const parentClassId = pChild?.wClass_Parent ?? pParent?.wClass_Object;
                const parentObjectId = pChild?.twParentIx ?? pParent?.twObjectIx;
                this._recordMutationEvent({
                    kind: 'inserted',
                    childClassId: pChild.wClass_Object,
                    childObjectId: pChild.twObjectIx,
                    parentClassId,
                    parentObjectId,
                    name: this.getObjectName(pChild),
                    mvmfModel: pChild,
                });
            }
            if (this.connected && pChild) {
                this._emit('nodeInserted', {
                    mvmfModel: pChild,
                    parentType: pParent?.sID,
                    parentId: pParent?.twObjectIx,
                });
            }
        }
        catch (err) {
            debugLog(`[onInserted] ERROR: ${err.message}`);
        }
    }
    onUpdated(pNotice) {
        try {
            if (this.isDisconnecting) {
                return;
            }
            const pChild = pNotice.pData?.pChild;
            const pUpdated = pChild || pNotice.pCreator;
            if (pUpdated?.twObjectIx && pUpdated?.wClass_Object) {
                const prefixedId = this.getPrefixedId(pUpdated);
                this.objectCache.set(prefixedId, pUpdated);
                this._recordMutationEvent({
                    kind: 'updated',
                    classId: pUpdated.wClass_Object,
                    objectId: pUpdated.twObjectIx,
                    mvmfModel: pUpdated,
                });
            }
            if (this.connected && pUpdated?.sID && pUpdated.twObjectIx !== undefined) {
                this._emit('nodeUpdated', {
                    id: pUpdated.twObjectIx,
                    type: pUpdated.sID,
                    mvmfModel: pUpdated,
                });
            }
        }
        catch (err) {
            debugLog(`[onUpdated] ERROR: ${err.message}`);
        }
    }
    attachTo(pObject) {
        if (pObject && typeof pObject.Attach === 'function' && !this.attachedObjects.has(pObject)) {
            pObject.Attach(this);
            this.attachedObjects.add(pObject);
        }
    }
    detachFrom(pObject) {
        if (pObject && this.attachedObjects.has(pObject)) {
            try {
                pObject.Detach(this);
            }
            catch {
                // Ignore errors during detach
            }
            this.attachedObjects.delete(pObject);
        }
    }
    detachAll() {
        for (const pObject of this.attachedObjects) {
            try {
                pObject.Detach(this);
            }
            catch {
                // Ignore errors during detach
            }
        }
        this.attachedObjects.clear();
    }
    onChanged(pNotice) {
        try {
            if (this.isDisconnecting) {
                return;
            }
            const pParent = pNotice.pCreator;
            const pChild = pNotice.pData?.pChild;
            const pChange = pNotice.pData?.pChange;
            if (!pParent?.IsReady?.()) {
                return;
            }
            if (pChild?.sID && pChild.twObjectIx !== undefined) {
                const emitInserted = () => {
                    const parentClassId = pChild?.wClass_Parent ?? pParent?.wClass_Object;
                    const parentObjectId = pChild?.twParentIx ?? pParent?.twObjectIx;
                    const prefixedId = this.getPrefixedId(pChild);
                    this.objectCache.set(prefixedId, pChild);
                    this._recordMutationEvent({
                        kind: 'inserted',
                        childClassId: pChild.wClass_Object,
                        childObjectId: pChild.twObjectIx,
                        parentClassId,
                        parentObjectId,
                        name: this.getObjectName(pChild),
                        mvmfModel: pChild,
                    });
                    this._emit('nodeInserted', {
                        mvmfModel: pChild,
                        parentType: pParent.sID,
                        parentId: pParent.twObjectIx,
                    });
                };
                const emitDeleted = () => {
                    const parentClassId = pChild?.wClass_Parent ?? pParent?.wClass_Object;
                    const parentObjectId = pChild?.twParentIx ?? pParent?.twObjectIx;
                    this._recordMutationEvent({
                        kind: 'deleted',
                        classId: pChild.wClass_Object,
                        objectId: pChild.twObjectIx,
                        parentClassId,
                        parentObjectId,
                    });
                    this._emit('nodeDeleted', {
                        id: pChild.twObjectIx,
                        type: pChild.sID,
                        sourceParentType: pParent.sID,
                        sourceParentId: pParent.twObjectIx,
                    });
                };
                if (pChange?.sType?.endsWith('_OPEN')) {
                    emitInserted();
                    return;
                }
                const present = this._isChildOf(pParent, pChild);
                if (present === false) {
                    emitDeleted();
                    return;
                }
                if (present === true) {
                    const prefixedId = this.getPrefixedId(pChild);
                    this.objectCache.set(prefixedId, pChild);
                    this._recordMutationEvent({
                        kind: 'updated',
                        classId: pChild.wClass_Object,
                        objectId: pChild.twObjectIx,
                        mvmfModel: pChild,
                    });
                    this._emit('nodeUpdated', {
                        id: pChild.twObjectIx,
                        type: pChild.sID,
                        mvmfModel: pChild,
                    });
                    return;
                }
                if (this.pLnG) {
                    const model = this.pLnG.Model_Open(pParent.sID, pParent.twObjectIx);
                    this.attachTo(model);
                }
                return;
            }
            this.onUpdated(pNotice);
        }
        catch (err) {
            debugLog(`[onChanged] ERROR: ${err.message}`);
        }
    }
    onDeleting(pNotice) {
        try {
            if (this.isDisconnecting) {
                return;
            }
            const pChild = pNotice.pData?.pChild;
            if (pChild?.twObjectIx && pChild?.wClass_Object) {
                const prefixedId = this.getPrefixedId(pChild);
                this.objectCache.delete(prefixedId);
                const parentClassId = pChild?.wClass_Parent ?? pNotice.pCreator?.wClass_Object;
                const parentObjectId = pChild?.twParentIx ?? pNotice.pCreator?.twObjectIx;
                this._recordMutationEvent({
                    kind: 'deleted',
                    classId: pChild.wClass_Object,
                    objectId: pChild.twObjectIx,
                    parentClassId,
                    parentObjectId,
                });
            }
            if (this.connected && pChild) {
                this._emit('nodeDeleted', {
                    id: pChild.twObjectIx,
                    type: pChild.sID,
                    sourceParentType: pNotice.pCreator?.sID,
                    sourceParentId: pNotice.pCreator?.twObjectIx,
                });
            }
        }
        catch (err) {
            debugLog(`[onDeleting] ERROR: ${err.message}`);
        }
    }
    /**
     * @param {string} fabricUrl
     * @param {string | ConnectOptions} [optionsOrAdminKey]
     * @param {number} [timeoutMs]
     * @returns {Promise<any>}
     */
    async connect(fabricUrl, optionsOrAdminKey = '', timeoutMs = 60000) {
        if (this.connected || this.pFabric) {
            await this.disconnect();
        }
        this.isDisconnecting = false;
        let adminKey = '';
        if (typeof optionsOrAdminKey === 'string') {
            adminKey = optionsOrAdminKey;
        }
        else if (optionsOrAdminKey && typeof optionsOrAdminKey === 'object') {
            adminKey = optionsOrAdminKey.adminKey || '';
            if (typeof optionsOrAdminKey.timeoutMs === 'number') {
                timeoutMs = optionsOrAdminKey.timeoutMs;
            }
        }
        this._acquireBootstrapRequirements();
        this.fabricUrl = fabricUrl;
        this.adminKey = adminKey;
        this.loginAttempted = false;
        this.rootReadyEmitted = false;
        this.searchableRMCObjectIndices = [];
        this.searchableRMTObjectIndices = [];
        this.ReadyState?.(SingleScopeClient.eSTATE.LOADING);
        this._emit('status', 'Loading map config...');
        ++this.connectionGeneration;
        const capturedGeneration = this.connectionGeneration;
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                if (this.connectionGeneration === capturedGeneration) {
                    this.connectResolve = null;
                    this.connectReject = null;
                    reject(new Error(`Connection timeout after ${timeoutMs}ms`));
                }
            }, timeoutMs);
            this.connectResolve = async () => {
                if (this.connectionGeneration === capturedGeneration) {
                    clearTimeout(timeoutId);
                    try {
                        if (this.pRMRoot) {
                            await this.waitForReady(this.pRMRoot, timeoutMs);
                        }
                        resolve(this.pRMRoot);
                    }
                    catch (err) {
                        reject(err);
                    }
                }
            };
            this.connectReject = (err) => {
                if (this.connectionGeneration === capturedGeneration) {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            };
            this.pFabric = new MV.MVRP.MSF(fabricUrl, MV.MVRP.MSF.eMETHOD.GET);
            this.attachTo(this.pFabric);
        });
    }
    handleReadyState(pNotice) {
        // Ignore callbacks from a previous connection
        if (pNotice.pCreator !== this.pFabric && pNotice.pCreator !== this.pLnG) {
            return;
        }
        if (pNotice.pCreator === this.pFabric) {
            if (this.pFabric.IsReady()) {
                this._emit('status', 'Connecting to Metaverse server...');
                this.pLnG = this.pFabric.GetLnG('map');
                const mapConfig = this.pFabric.pMSFConfig?.map;
                this.sceneWClass = mapConfig?.wClass ?? null;
                this.sceneObjectIx = mapConfig?.twObjectIx ?? null;
                if (!this.pLnG) {
                    const err = new Error('Failed to get LnG "map" from fabric config');
                    this.connectReject?.(err);
                    this._emit('error', err);
                    this.connectResolve = null;
                    this.connectReject = null;
                    return;
                }
                this.attachTo(this.pLnG);
            }
            else if (this.pFabric.ReadyState() === this.pFabric.eSTATE.ERROR) {
                const err = new Error('Failed to load fabric config from ' + this.fabricUrl);
                this.connectReject?.(err);
                this._emit('error', err);
                this.connectResolve = null;
                this.connectReject = null;
            }
        }
        else if (pNotice.pCreator === this.pLnG) {
            const state = this.pLnG.ReadyState();
            if (state === this.pLnG.eSTATE.CONNECTING) {
                this._emit('status', 'Connecting to server...');
                return;
            }
            if (state === this.pLnG.eSTATE.LOGGING) {
                this._emit('status', 'Authenticating...');
                return;
            }
            if (state === this.pLnG.eSTATE.LOGGEDIN) {
                const wasConnected = this.connected;
                this.connected = true;
                this.loggedIn = true;
                if (!wasConnected) {
                    this._emit('status', 'Connected, loading map...');
                    this._emit('connected');
                    this.start();
                    this.connectResolve?.();
                    this.connectResolve = null;
                    this.connectReject = null;
                }
            }
            else if (state === this.pLnG.eSTATE.LOGGEDOUT) {
                if (this.adminKey) {
                    if (this.loginAttempted) {
                        this.connectReject?.(new Error('Login failed: invalid admin key or authentication error'));
                        this.connectResolve = null;
                        this.connectReject = null;
                    }
                    else {
                        this.loginAttempted = true;
                        this.pLnG.Login('token=' + MV.MVMF.Escape(this.adminKey));
                    }
                }
                else {
                    this.connected = true;
                    this.loggedIn = false;
                    this._emit('status', 'Connected, loading map...');
                    this._emit('connected');
                    this.start();
                    this.connectResolve?.();
                    this.connectResolve = null;
                    this.connectReject = null;
                }
            }
            else if (state === this.pLnG.eSTATE.DISCONNECTED) {
                this._emit('status', 'Disconnected from server');
                this._emit('disconnected');
                if (this.connected) {
                    this.handleUnexpectedDisconnect();
                }
                else {
                    this.connectReject?.(new Error('Disconnected from server'));
                    this.connectResolve = null;
                    this.connectReject = null;
                }
            }
            else if (state === this.pLnG.eSTATE.ERROR) {
                this._emit('disconnected');
                if (this.connected) {
                    this.handleUnexpectedDisconnect();
                }
                else {
                    this.connectReject?.(new Error('LnG connection error'));
                    this.connectResolve = null;
                    this.connectReject = null;
                }
            }
        }
    }
    handleUnexpectedDisconnect() {
        this.connected = false;
        this.loggedIn = false;
        // Reject all pending object-ready promises
        for (const [, pending] of this.pendingReady) {
            pending.reject(new Error('Connection lost'));
        }
        this.pendingReady.clear();
        for (const wait of this.pendingMutationWaits) {
            clearTimeout(wait.timeoutId);
            wait.reject(new Error('Connection lost'));
        }
        this.pendingMutationWaits.clear();
        this.recentMutationEvents = [];
    }
    start() {
        const hasScopedRoot = !this.adminKey && this.sceneWClass && this.sceneObjectIx;
        if (hasScopedRoot) {
            const classMap = {
                70: 'RMRoot',
                71: 'RMCObject',
                72: 'RMTObject',
                73: 'RMPObject',
            };
            const sceneType = classMap[this.sceneWClass];
            if (sceneType) {
                this.pRMRoot = this.pLnG.Model_Open(sceneType, this.sceneObjectIx);
            }
        }
        if (!this.pRMRoot) {
            this.pRMRoot = this.pLnG.Model_Open('RMRoot', 1);
        }
        this.attachTo(this.pRMRoot);
    }
    async openAndWait(modelType, objectId, timeoutMs) {
        const pObject = this.pLnG.Model_Open(modelType, objectId);
        if (!pObject) {
            throw new Error(`Failed to open ${modelType} with id ${objectId}`);
        }
        this.attachTo(pObject);
        await this.waitForReady(pObject, timeoutMs);
        return pObject;
    }
    static CLASS_ID_TO_TYPE = {
        [ClassIds.RMRoot]: 'RMRoot',
        [ClassIds.RMPObject]: 'RMPObject',
        [ClassIds.RMTObject]: 'RMTObject',
        [ClassIds.RMCObject]: 'RMCObject',
    };
    static CHILD_CLASS_TYPES = ['RMPObject', 'RMTObject', 'RMCObject'];
    async openWithKnownType(objectId, classId, timeoutMs) {
        const modelType = SingleScopeClient.CLASS_ID_TO_TYPE[classId];
        if (!modelType) {
            throw new Error(`Unknown class ID: ${classId}`);
        }
        return await this.openAndWait(modelType, objectId, timeoutMs);
    }
    enumAllChildTypes(pObject, callback) {
        for (const childType of SingleScopeClient.CHILD_CLASS_TYPES) {
            pObject.Child_Enum(childType, this, callback, null);
        }
    }
    /**
     * @param {ModelRef} params
     * @returns {void}
     */
    openModel({ sID, twObjectIx }) {
        if (!this.pLnG)
            return;
        const mvmfModel = this.pLnG.Model_Open(sID, twObjectIx);
        if (!mvmfModel)
            return;
        this.attachTo(mvmfModel);
        if (mvmfModel.IsReady?.()) {
            this._emit('modelReady', { mvmfModel });
        }
    }
    /**
     * @param {ModelRef} params
     * @returns {void}
     */
    closeModel({ sID, twObjectIx }) {
        if (!this.pLnG)
            return;
        const mvmfModel = this.pLnG.Model_Open(sID, twObjectIx);
        this.detachFrom(mvmfModel);
        try {
            if (mvmfModel && mvmfModel !== this.pRMRoot && mvmfModel !== this.pLnG && mvmfModel !== this.pFabric) {
                this.pLnG.Model_Close(mvmfModel);
            }
        }
        catch {
            // best effort close
        }
    }
    /**
     * @param {any} model
     * @returns {any[]}
     */
    enumerateChildren(model) {
        const children = [];
        if (!model?.Child_Enum) {
            return children;
        }
        const enumCallback = (child) => {
            children.push(child);
        };
        model.Child_Enum('RMCObject', this, enumCallback, null);
        model.Child_Enum('RMTObject', this, enumCallback, null);
        model.Child_Enum('RMPObject', this, enumCallback, null);
        return children;
    }
    _collectSearchableIndices(model) {
        if (!model)
            return;
        if (model.sID === 'RMCObject') {
            this.searchableRMCObjectIndices = [model.twObjectIx];
            this.searchableRMTObjectIndices = [];
            return;
        }
        if (model.sID === 'RMTObject') {
            this.searchableRMTObjectIndices = [model.twObjectIx];
            this.searchableRMCObjectIndices = [];
            return;
        }
        this.searchableRMCObjectIndices = [];
        this.searchableRMTObjectIndices = [];
        const children = this.enumerateChildren(model);
        for (const child of children) {
            if (child.sID === 'RMCObject') {
                this.searchableRMCObjectIndices.push(child.twObjectIx);
            }
            else if (child.sID === 'RMTObject') {
                this.searchableRMTObjectIndices.push(child.twObjectIx);
            }
        }
    }
    _collectSearchIndicesFromSceneRoot(rmcObjectIndices, rmtObjectIndices) {
        rmcObjectIndices.push(...this.searchableRMCObjectIndices);
        rmtObjectIndices.push(...this.searchableRMTObjectIndices);
    }
    /**
     * @param {string} searchText
     * @returns {Promise<SearchNodesResult>}
     */
    async searchNodes(searchText) {
        if (!this.connected || !searchText) {
            return { matches: [], paths: [], unavailable: [] };
        }
        const results = { matches: [], paths: [], unavailable: [] };
        const rmcObjectIndices = [];
        const rmtObjectIndices = [];
        this._collectSearchIndicesFromSceneRoot(rmcObjectIndices, rmtObjectIndices);
        if (rmcObjectIndices.length === 0 && rmtObjectIndices.length === 0) {
            return results;
        }
        const searchPromises = [];
        for (const objectIx of rmcObjectIndices) {
            searchPromises.push(this._searchObjectType('RMCObject', objectIx, searchText));
        }
        for (const objectIx of rmtObjectIndices) {
            searchPromises.push(this._searchObjectType('RMTObject', objectIx, searchText));
        }
        const searchResults = await Promise.all(searchPromises);
        const unavailableTypes = new Set();
        for (const result of searchResults) {
            results.matches.push(...result.matches);
            results.paths.push(...result.paths);
            if (result.unavailable) {
                unavailableTypes.add(result.unavailable);
            }
        }
        results.unavailable = [...unavailableTypes];
        return results;
    }
    async _searchObjectType(objectType, objectIx, searchText) {
        const matches = [];
        const paths = [];
        try {
            const model = this.pLnG.Model_Open(objectType, objectIx);
            if (!model?.IsReady?.()) {
                return { matches, paths, unavailable: objectType };
            }
            const pIAction = model.Request('SEARCH');
            if (!pIAction) {
                return { matches, paths, unavailable: objectType };
            }
            if (objectType === 'RMCObject') {
                pIAction.pRequest.twRMCObjectIx = objectIx;
            }
            else {
                pIAction.pRequest.twRMTObjectIx = objectIx;
            }
            pIAction.pRequest.dX = 0;
            pIAction.pRequest.dY = 0;
            pIAction.pRequest.dZ = 0;
            pIAction.pRequest.sText = searchText.toLowerCase();
            const response = await this._sendAction(pIAction);
            if (response.nResult === -1) {
                return { matches, paths, unavailable: objectType };
            }
            if (response.aResultSet?.[0] && Array.isArray(response.aResultSet[0])) {
                for (let i = 0; i < response.aResultSet[0].length; i += 1) {
                    const match = response.aResultSet[0][i];
                    matches.push({
                        id: match.ObjectHead_twObjectIx,
                        name: match.Name_wsRMCObjectId || match.Name_wsRMTObjectId,
                        type: objectType,
                        nodeType: match.Type_bType,
                        parentType: this._getClassID(match.ObjectHead_wClass_Parent),
                        parentId: match.ObjectHead_twParentIx,
                        matchOrder: i,
                        rootId: objectIx,
                    });
                }
            }
            if (response.aResultSet?.[1] && Array.isArray(response.aResultSet[1])) {
                for (const ancestor of response.aResultSet[1]) {
                    paths.push({
                        id: ancestor.ObjectHead_twObjectIx,
                        name: ancestor.Name_wsRMCObjectId || ancestor.Name_wsRMTObjectId,
                        type: objectType,
                        nodeType: ancestor.Type_bType,
                        parentType: this._getClassID(ancestor.ObjectHead_wClass_Parent),
                        parentId: ancestor.ObjectHead_twParentIx,
                        ancestorDepth: ancestor.nAncestor,
                        matchOrder: ancestor.nOrder,
                        rootId: objectIx,
                    });
                }
            }
        }
        catch {
            // fail individual search without failing all
        }
        return { matches, paths };
    }
    _getClassID(wClass) {
        const classIds = {
            70: 'RMRoot',
            71: 'RMCObject',
            72: 'RMTObject',
            73: 'RMPObject',
        };
        return classIds[wClass];
    }
    /**
     * @param {ClientEvent} event
     * @param {ClientEventHandler} handler
     * @returns {void}
     */
    on(event, handler) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(handler);
        }
    }
    /**
     * @param {ClientEvent} event
     * @param {ClientEventHandler} handler
     * @returns {void}
     */
    off(event, handler) {
        if (!this.callbacks[event]) {
            return;
        }
        const index = this.callbacks[event].indexOf(handler);
        if (index !== -1) {
            this.callbacks[event].splice(index, 1);
        }
    }
    _emit(event, data) {
        this.callbacks[event]?.forEach((handler) => {
            try {
                handler(data);
            }
            catch {
                // handler errors should not propagate
            }
        });
    }
    /**
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (this.isDisconnecting) {
            return;
        }
        this.isDisconnecting = true;
        try {
            const pLnG = this.pLnG;
            const pFabric = this.pFabric;
            const pRMRoot = this.pRMRoot;
            // Bump generation so any in-flight callbacks from this connection are ignored
            this.connectionGeneration++;
            // Reject any pending connect promise
            if (this.connectReject) {
                this.connectReject(new Error('Disconnected'));
            }
            this.connectResolve = null;
            this.connectReject = null;
            // Reject all pending object-ready promises
            for (const [key, pending] of this.pendingReady) {
                pending.reject(new Error('Disconnected'));
            }
            this.pendingReady.clear();
            for (const wait of this.pendingMutationWaits) {
                clearTimeout(wait.timeoutId);
                wait.reject(new Error('Disconnected'));
            }
            this.pendingMutationWaits.clear();
            this.recentMutationEvents = [];
            // Mirror legacy behavior: tear down local objects immediately without waiting for remote logout flow.
            // Detach from all MVMF objects before destroying
            this.detachAll();
            this.pRMRoot = null;
            if (pRMRoot && pLnG?.Model_Close) {
                try {
                    pLnG.Model_Close(pRMRoot);
                }
                catch {
                    // Ignore errors during teardown
                }
            }
            if (pFabric?.destructor) {
                try {
                    pFabric.destructor();
                }
                catch {
                    // Ignore errors during teardown
                }
            }
            this.pFabric = null;
            this.pLnG = null;
            this.connected = false;
            this.loggedIn = false;
            this.fabricUrl = null;
            this.adminKey = null;
            this.currentSceneId = null;
            this.objectCache.clear();
            this.searchableRMCObjectIndices = [];
            this.searchableRMTObjectIndices = [];
            this.rootReadyEmitted = false;
            this.ReadyState?.(SingleScopeClient.eSTATE.NOTREADY);
            this._emit('status', 'Disconnected from server');
            this._emit('disconnected');
        }
        finally {
            this._releaseBootstrapRequirements();
            this.isDisconnecting = false;
        }
    }
    /**
     * @returns {ConnectionStatus}
     */
    getStatus() {
        return {
            connected: this.connected,
            fabricUrl: this.fabricUrl,
            currentSceneId: this.currentSceneId,
            currentSceneName: null,
            resourceRootUrl: this.getResourceRootUrl() || null,
        };
    }
    /**
     * @returns {Promise<Scene[]>}
     */
    async listScenes() {
        await this.ensureConnected();
        await this.waitForReady(this.pRMRoot);
        const scenes = [];
        const seenIds = new Set();
        const enumCallback = (pRMXObject) => {
            const prefixedId = this.getPrefixedId(pRMXObject);
            if (seenIds.has(prefixedId))
                return;
            seenIds.add(prefixedId);
            const name = this.getObjectName(pRMXObject);
            const classId = pRMXObject.wClass_Object;
            scenes.push({ id: prefixedId, name, rootObjectId: prefixedId, classId });
        };
        this.enumAllChildTypes(this.pRMRoot, enumCallback);
        return scenes;
    }
    /**
     * @param {string} sceneId
     * @returns {Promise<FabricObject>}
     */
    async openScene(sceneId) {
        await this.ensureConnected();
        const { classId, numericId } = parseObjectRef(sceneId);
        const pObject = await this.openWithKnownType(numericId, classId);
        this.currentSceneId = sceneId;
        this.objectCache.set(sceneId, pObject);
        // Eagerly load direct children so list_objects works immediately
        await this.loadDirectChildren(pObject);
        return this.rmxToFabricObject(pObject);
    }
    async loadDirectChildren(pObject) {
        const children = [];
        this.enumAllChildTypes(pObject, (child) => {
            children.push(child);
        });
        if (children.length > 0) {
            debugLog(`[loadDirectChildren] opening ${children.length} children`);
            await Promise.all(children.map(async (child) => {
                const childPrefixedId = this.getPrefixedId(child);
                if (this.objectCache.has(childPrefixedId))
                    return;
                try {
                    const childClassId = child.wClass_Object;
                    const pChild = await this.openWithKnownType(child.twObjectIx, childClassId);
                    this.objectCache.set(childPrefixedId, pChild);
                }
                catch (err) {
                    debugLog(`[loadDirectChildren] failed to open child ${childPrefixedId}: ${err.message}`);
                }
            }));
        }
    }
    /**
     * @param {string} name
     * @param {string} [objectType]
     * @returns {Promise<Scene>}
     */
    async createScene(name, objectType) {
        const obj = await this.createObject({
            parentId: 'root',
            name,
            objectType,
            bound: { x: 150, y: 150, z: 150 },
        });
        return { id: obj.id, name, rootObjectId: obj.id, classId: obj.classId };
    }
    /**
     * @param {string} sceneId
     * @returns {Promise<void>}
     */
    async deleteScene(sceneId) {
        await this.ensureConnected();
        await this.waitForReady(this.pRMRoot);
        const { classId, numericId } = parseObjectRef(sceneId);
        const closeInfo = CLASS_ID_TO_CLOSE_ACTION[classId];
        if (!closeInfo) {
            throw new Error(`Cannot delete object of class ${classId}`);
        }
        const startedAt = Date.now();
        const response = await this.sendAction(this.pRMRoot, closeInfo.action, (payload) => {
            payload[closeInfo.idField] = numericId;
            payload.bDeleteAll = 1;
        });
        if (response.nResult !== 0) {
            throw new Error(this.formatResponseError('Failed to delete scene', response));
        }
        await this._confirmMutation((event) => {
            if (event.kind !== 'deleted' || event.classId !== classId || event.objectId !== numericId) {
                return false;
            }
            if (event.parentClassId == null || event.parentObjectId == null) {
                return true;
            }
            return event.parentClassId === ClassIds.RMRoot &&
                event.parentObjectId === this.pRMRoot.twObjectIx;
        }, `delete scene ${sceneId}`, undefined, startedAt);
        if (this.currentSceneId === sceneId) {
            this.currentSceneId = null;
        }
        this.objectCache.delete(sceneId);
    }
    /**
     * @param {string} scopeId
     * @param {ObjectFilter} [filter]
     * @returns {Promise<FabricObject[]>}
     */
    async listObjects(scopeId, filter) {
        await this.ensureConnected();
        if (!this.objectCache.has(scopeId)) {
            const { classId, numericId } = parseObjectRef(scopeId);
            const pScene = await this.openWithKnownType(numericId, classId);
            this.objectCache.set(scopeId, pScene);
        }
        const objects = [];
        const seenIds = new Set();
        const collectLoaded = (pObject) => {
            const prefixedId = this.getPrefixedId(pObject);
            if (seenIds.has(prefixedId))
                return;
            seenIds.add(prefixedId);
            objects.push(this.rmxToFabricObject(pObject));
            this.enumAllChildTypes(pObject, (child) => {
                collectLoaded(child);
            });
        };
        const pScene = this.objectCache.get(scopeId);
        if (pScene) {
            collectLoaded(pScene);
        }
        let result = objects;
        if (filter?.type) {
            const typeInfo = ObjectTypeMap[filter.type];
            if (typeInfo) {
                result = result.filter(obj => obj.classId === typeInfo.classId && obj.type === typeInfo.type);
            }
            else {
                result = result.filter(obj => obj.id.startsWith(filter.type + ':'));
            }
        }
        if (filter?.namePattern) {
            const pattern = new RegExp(filter.namePattern, 'i');
            result = result.filter(obj => pattern.test(obj.name));
        }
        return result;
    }
    /**
     * @param {string} objectId
     * @returns {Promise<FabricObject>}
     */
    async getObject(objectId) {
        await this.ensureConnected();
        const { classId, numericId } = parseObjectRef(objectId);
        let pObject = this.objectCache.get(objectId);
        if (pObject) {
            if (!pObject.IsReady?.()) {
                debugLog(`[getObject] cached object ${objectId} not ready (class ${classId}), opening to load children`);
                pObject = await this.openWithKnownType(numericId, classId);
                this.objectCache.set(objectId, pObject);
            }
        }
        else {
            pObject = await this.openWithKnownType(numericId, classId);
            this.objectCache.set(objectId, pObject);
        }
        return this.rmxToFabricObject(pObject);
    }
    /**
     * @param {CreateObjectParams} params
     * @returns {Promise<FabricObject>}
     */
    async createObject(params) {
        await this.ensureConnected();
        // Determine child class from objectType
        let childClassId;
        let bType;
        if (params.objectType) {
            const typeInfo = ObjectTypeMap[params.objectType];
            if (!typeInfo) {
                throw new Error(`Unknown objectType "${params.objectType}". Valid types: ${Object.keys(ObjectTypeMap).join(', ')}`);
            }
            childClassId = typeInfo.classId;
            bType = typeInfo.type;
        }
        else {
            childClassId = ClassIds.RMPObject;
            bType = 0;
        }
        const openInfo = CLASS_ID_TO_OPEN_ACTION[childClassId];
        if (!openInfo) {
            throw new Error(`Cannot create objects of class ${childClassId}`);
        }
        const isRootParent = params.parentId === 'root';
        let pParent;
        if (isRootParent) {
            await this.waitForReady(this.pRMRoot);
            pParent = this.pRMRoot;
        }
        else {
            const { classId: parentClassId, numericId: parentNumericId } = parseObjectRef(params.parentId);
            pParent = this.objectCache.get(params.parentId);
            if (!pParent) {
                pParent = await this.openWithKnownType(parentNumericId, parentClassId);
                this.objectCache.set(params.parentId, pParent);
            }
        }
        this.attachTo(pParent);
        const isCelestial = childClassId === ClassIds.RMCObject;
        const isTerrestrial = childClassId === ClassIds.RMTObject;
        const startedAt = Date.now();
        const response = await this.sendAction(pParent, openInfo.action, (payload) => {
            payload.pName[openInfo.nameField] = params.name;
            payload.pType.bType = bType;
            payload.pType.bSubtype = params.subtype ?? 0;
            payload.pType.bFiction = 0;
            if (childClassId === ClassIds.RMPObject) {
                payload.pType.bMovable = 0;
            }
            payload.pOwner.twRPersonaIx = 1;
            payload.pResource.qwResource = 0;
            payload.pResource.sName = params.resourceName || '';
            payload.pResource.sReference = params.resourceReference || '';
            payload.pTransform.vPosition.dX = params.position?.x ?? 0;
            payload.pTransform.vPosition.dY = params.position?.y ?? 0;
            payload.pTransform.vPosition.dZ = params.position?.z ?? 0;
            payload.pTransform.qRotation.dX = params.rotation?.x ?? 0;
            payload.pTransform.qRotation.dY = params.rotation?.y ?? 0;
            payload.pTransform.qRotation.dZ = params.rotation?.z ?? 0;
            payload.pTransform.qRotation.dW = params.rotation?.w ?? 1;
            payload.pTransform.vScale.dX = params.scale?.x ?? 1;
            payload.pTransform.vScale.dY = params.scale?.y ?? 1;
            payload.pTransform.vScale.dZ = params.scale?.z ?? 1;
            payload.pBound.dX = params.bound?.x ?? 1;
            payload.pBound.dY = params.bound?.y ?? 1;
            payload.pBound.dZ = params.bound?.z ?? 1;
            if (isTerrestrial) {
                payload.pProperties.bLockToGround = 0;
                payload.pProperties.bYouth = 0;
                payload.pProperties.bAdult = 0;
                payload.pProperties.bAvatar = 0;
                payload.pCoord.bCoord = 3;
                payload.pCoord.dA = 0;
                payload.pCoord.dB = 0;
                payload.pCoord.dC = 0;
            }
            if (isCelestial) {
                payload.pOrbit_Spin.tmPeriod = params.orbit?.period ?? 0;
                payload.pOrbit_Spin.tmStart = params.orbit?.start ?? 0;
                payload.pOrbit_Spin.dA = params.orbit?.a ?? 0;
                payload.pOrbit_Spin.dB = params.orbit?.b ?? 0;
                payload.pProperties.fMass = params.properties?.mass ?? 0;
                payload.pProperties.fGravity = params.properties?.gravity ?? 0;
                payload.pProperties.fColor = params.properties?.color ?? 0;
                payload.pProperties.fBrightness = params.properties?.brightness ?? 0;
                payload.pProperties.fReflectivity = params.properties?.reflectivity ?? 0;
            }
        });
        if (response.nResult !== 0) {
            throw new Error(this.formatResponseError('Failed to create object', response));
        }
        const numericNewId = response.aResultSet?.[0]?.[0]?.[openInfo.resultField];
        const newId = numericNewId != null
            ? formatObjectRef(childClassId, numericNewId)
            : `${formatObjectRef(childClassId, Date.now())}`;
        const buildResult = (confirmed) => ({
            id: newId,
            parentId: params.parentId,
            name: params.name,
            transform: {
                position: params.position ?? { x: 0, y: 0, z: 0 },
                rotation: params.rotation ?? { x: 0, y: 0, z: 0, w: 1 },
                scale: params.scale ?? { x: 1, y: 1, z: 1 },
            },
            resourceReference: params.resourceReference ?? null,
            resourceName: params.resourceName ?? null,
            bound: null,
            classId: childClassId,
            type: bType,
            subtype: params.subtype ?? 0,
            isAttachmentPoint: (params.subtype ?? 0) === 255,
            children: null,
            orbit: isCelestial ? params.orbit ?? undefined : undefined,
            properties: isCelestial ? params.properties ?? undefined : undefined,
            confirmed,
        });
        if (params.skipConfirmation) {
            return buildResult(false);
        }
        const confirmResult = await this._confirmMutation((event) => {
            if (event.kind !== 'inserted' || event.childClassId !== childClassId) {
                return false;
            }
            const idOrNameMatches = numericNewId != null
                ? event.childObjectId === numericNewId
                : event.name === params.name;
            if (!idOrNameMatches) {
                return false;
            }
            if (event.parentClassId == null || event.parentObjectId == null) {
                return true;
            }
            return event.parentClassId === pParent.wClass_Object &&
                event.parentObjectId === pParent.twObjectIx;
        }, `create object ${params.name}`, params.mutationTimeoutMs ?? undefined, startedAt, params.tolerateTimeout ?? false);
        return buildResult(confirmResult.confirmed);
    }
    /**
     * @param {UpdateObjectParams} params
     * @returns {Promise<FabricObject>}
     */
    async updateObject(params) {
        await this.ensureConnected();
        const { classId, numericId } = parseObjectRef(params.objectId);
        let pObject = this.objectCache.get(params.objectId);
        if (!pObject) {
            pObject = await this.openWithKnownType(numericId, classId);
            this.objectCache.set(params.objectId, pObject);
        }
        this.attachTo(pObject);
        if (params.name !== undefined) {
            const nameField = CLASS_ID_TO_NAME_FIELD[classId];
            if (!nameField) {
                throw new Error(`Cannot rename object of class ${classId}`);
            }
            const startedAt = Date.now();
            const response = await this.sendAction(pObject, 'NAME', (payload) => {
                payload.pName[nameField] = params.name;
            });
            if (response.nResult !== 0) {
                throw new Error(this.formatResponseError('Failed to update name', response));
            }
            await this._confirmMutation((event) => event.kind === 'updated' &&
                event.classId === classId &&
                event.objectId === numericId, `update name for ${params.objectId}`, undefined, startedAt);
        }
        if (params.position !== undefined || params.rotation !== undefined || params.scale !== undefined) {
            const startedAt = Date.now();
            const response = await this.sendAction(pObject, 'TRANSFORM', (payload) => {
                payload.pTransform.vPosition.dX = params.position?.x ?? pObject.pTransform?.vPosition?.dX ?? 0;
                payload.pTransform.vPosition.dY = params.position?.y ?? pObject.pTransform?.vPosition?.dY ?? 0;
                payload.pTransform.vPosition.dZ = params.position?.z ?? pObject.pTransform?.vPosition?.dZ ?? 0;
                payload.pTransform.qRotation.dX = params.rotation?.x ?? pObject.pTransform?.qRotation?.dX ?? 0;
                payload.pTransform.qRotation.dY = params.rotation?.y ?? pObject.pTransform?.qRotation?.dY ?? 0;
                payload.pTransform.qRotation.dZ = params.rotation?.z ?? pObject.pTransform?.qRotation?.dZ ?? 0;
                payload.pTransform.qRotation.dW = params.rotation?.w ?? pObject.pTransform?.qRotation?.dW ?? 1;
                payload.pTransform.vScale.dX = params.scale?.x ?? pObject.pTransform?.vScale?.dX ?? 1;
                payload.pTransform.vScale.dY = params.scale?.y ?? pObject.pTransform?.vScale?.dY ?? 1;
                payload.pTransform.vScale.dZ = params.scale?.z ?? pObject.pTransform?.vScale?.dZ ?? 1;
                if (classId === ClassIds.RMTObject) {
                    payload.pCoord.bCoord = 3;
                    payload.pCoord.dA = 0;
                    payload.pCoord.dB = 0;
                    payload.pCoord.dC = 0;
                }
            });
            if (response.nResult !== 0) {
                throw new Error(this.formatResponseError('Failed to update transform', response));
            }
            await this._confirmMutation((event) => event.kind === 'updated' &&
                event.classId === classId &&
                event.objectId === numericId, `update transform for ${params.objectId}`, undefined, startedAt);
        }
        if (params.resourceReference !== undefined || params.resourceName !== undefined) {
            const startedAt = Date.now();
            const response = await this.sendAction(pObject, 'RESOURCE', (payload) => {
                payload.pResource.sReference = params.resourceReference !== undefined
                    ? params.resourceReference
                    : (pObject.pResource?.sReference ?? '');
                payload.pResource.sName = params.resourceName !== undefined
                    ? params.resourceName
                    : (pObject.pResource?.sName ?? '');
            });
            if (response.nResult !== 0) {
                throw new Error(this.formatResponseError('Failed to update resource', response));
            }
            await this._confirmMutation((event) => event.kind === 'updated' &&
                event.classId === classId &&
                event.objectId === numericId, `update resource for ${params.objectId}`, undefined, startedAt);
        }
        if (params.bound !== undefined) {
            const startedAt = Date.now();
            const response = await this.sendAction(pObject, 'BOUND', (payload) => {
                payload.pBound.dX = params.bound.x;
                payload.pBound.dY = params.bound.y;
                payload.pBound.dZ = params.bound.z;
            });
            if (response.nResult !== 0) {
                throw new Error(this.formatResponseError('Failed to update bound', response));
            }
            await this._confirmMutation((event) => event.kind === 'updated' &&
                event.classId === classId &&
                event.objectId === numericId, `update bound for ${params.objectId}`, undefined, startedAt);
        }
        if (params.orbit !== undefined) {
            // IO transport registers this as 'ORBIT_SPIN', SB transport as 'ORBIT'
            const orbitAction = pObject.Request('ORBIT_SPIN') ? 'ORBIT_SPIN' : 'ORBIT';
            const startedAt = Date.now();
            const response = await this.sendAction(pObject, orbitAction, (payload) => {
                payload.pOrbit_Spin.tmPeriod = params.orbit.period;
                payload.pOrbit_Spin.tmStart = params.orbit.start;
                payload.pOrbit_Spin.dA = params.orbit.a;
                payload.pOrbit_Spin.dB = params.orbit.b;
            });
            if (response.nResult !== 0) {
                throw new Error(this.formatResponseError('Failed to update orbit', response));
            }
            await this._confirmMutation((event) => event.kind === 'updated' &&
                event.classId === classId &&
                event.objectId === numericId, `update orbit for ${params.objectId}`, undefined, startedAt);
        }
        if (params.properties !== undefined) {
            const startedAt = Date.now();
            const response = await this.sendAction(pObject, 'PROPERTIES', (payload) => {
                payload.pProperties.fMass = params.properties.mass;
                payload.pProperties.fGravity = params.properties.gravity;
                payload.pProperties.fColor = params.properties.color;
                payload.pProperties.fBrightness = params.properties.brightness;
                payload.pProperties.fReflectivity = params.properties.reflectivity;
            });
            if (response.nResult !== 0) {
                throw new Error(this.formatResponseError('Failed to update properties', response));
            }
            await this._confirmMutation((event) => event.kind === 'updated' &&
                event.classId === classId &&
                event.objectId === numericId, `update properties for ${params.objectId}`, undefined, startedAt);
        }
        if (params.objectType !== undefined || params.subtype !== undefined) {
            let desiredBType = pObject.pType?.bType ?? 0;
            let desiredBSubtype = pObject.pType?.bSubtype ?? 0;
            if (params.objectType !== undefined) {
                const typeInfo = ObjectTypeMap[params.objectType];
                if (!typeInfo) {
                    throw new Error(`Unknown objectType "${params.objectType}". Valid types: ${Object.keys(ObjectTypeMap).join(', ')}`);
                }
                if (typeInfo.classId !== classId) {
                    throw new Error(`Cannot change object class: object is class ${classId} but objectType "${params.objectType}" is class ${typeInfo.classId}. Class is immutable.`);
                }
                desiredBType = typeInfo.type;
            }
            if (params.subtype !== undefined) {
                desiredBSubtype = params.subtype;
            }
            const currentBType = pObject.pType?.bType ?? 0;
            const currentBSubtype = pObject.pType?.bSubtype ?? 0;
            if (currentBType !== desiredBType || currentBSubtype !== desiredBSubtype) {
                const startedAt = Date.now();
                const response = await this.sendAction(pObject, 'TYPE', (payload) => {
                    payload.pType.bType = desiredBType;
                    payload.pType.bSubtype = desiredBSubtype;
                    payload.pType.bFiction = pObject.pType?.bFiction ?? 0;
                    payload.pType.bMovable = pObject.pType?.bMovable ?? 0;
                });
                if (response.nResult !== 0) {
                    throw new Error(this.formatResponseError('Failed to update type', response));
                }
                await this._confirmMutation((event) => event.kind === 'updated' &&
                    event.classId === classId &&
                    event.objectId === numericId, `update type for ${params.objectId}`, undefined, startedAt);
            }
        }
        if (params.skipRefetch) {
            const parentPrefixedId = pObject.twParentIx && pObject.wClass_Parent
                ? formatObjectRef(pObject.wClass_Parent, pObject.twParentIx)
                : null;
            const isCelestial = pObject.wClass_Object === 71;
            const effectiveBSubtype = params.subtype ?? (pObject.pType?.bSubtype ?? 0);
            return {
                id: params.objectId,
                parentId: parentPrefixedId,
                name: params.name ?? this.getObjectName(pObject),
                transform: {
                    position: params.position ?? { x: pObject.pTransform?.vPosition?.dX ?? 0, y: pObject.pTransform?.vPosition?.dY ?? 0, z: pObject.pTransform?.vPosition?.dZ ?? 0 },
                    rotation: params.rotation ?? { x: pObject.pTransform?.qRotation?.dX ?? 0, y: pObject.pTransform?.qRotation?.dY ?? 0, z: pObject.pTransform?.qRotation?.dZ ?? 0, w: pObject.pTransform?.qRotation?.dW ?? 1 },
                    scale: params.scale ?? { x: pObject.pTransform?.vScale?.dX ?? 1, y: pObject.pTransform?.vScale?.dY ?? 1, z: pObject.pTransform?.vScale?.dZ ?? 1 },
                },
                resourceReference: params.resourceReference ?? pObject.pResource?.sReference ?? null,
                resourceName: params.resourceName ?? pObject.pResource?.sName ?? null,
                bound: null,
                classId: pObject.wClass_Object,
                type: pObject.pType?.bType ?? 0,
                subtype: effectiveBSubtype,
                isAttachmentPoint: effectiveBSubtype === 255,
                children: null,
                orbit: isCelestial && pObject.pOrbit_Spin ? {
                    period: params.orbit?.period ?? pObject.pOrbit_Spin.tmPeriod ?? 0,
                    start: params.orbit?.start ?? pObject.pOrbit_Spin.tmStart ?? 0,
                    a: params.orbit?.a ?? pObject.pOrbit_Spin.dA ?? 0,
                    b: params.orbit?.b ?? pObject.pOrbit_Spin.dB ?? 0,
                } : undefined,
                properties: isCelestial && pObject.pProperties ? {
                    mass: params.properties?.mass ?? pObject.pProperties.fMass ?? 0,
                    gravity: params.properties?.gravity ?? pObject.pProperties.fGravity ?? 0,
                    color: params.properties?.color ?? pObject.pProperties.fColor ?? 0,
                    brightness: params.properties?.brightness ?? pObject.pProperties.fBrightness ?? 0,
                    reflectivity: params.properties?.reflectivity ?? pObject.pProperties.fReflectivity ?? 0,
                } : undefined,
            };
        }
        const result = await this.getObject(params.objectId);
        for (const field of ['name', 'resourceReference', 'resourceName', 'bound', 'orbit']) {
            if (params[field] !== undefined) {
                result[field] = params[field];
            }
        }
        for (const field of ['position', 'rotation', 'scale']) {
            if (params[field] !== undefined) {
                result.transform[field] = params[field];
            }
        }
        if (params.objectType !== undefined) {
            const typeInfo = ObjectTypeMap[params.objectType];
            if (typeInfo) {
                result.type = typeInfo.type;
            }
        }
        if (params.subtype !== undefined) {
            result.subtype = params.subtype;
            result.isAttachmentPoint = params.subtype === 255;
        }
        if (params.properties !== undefined) {
            result.properties = {
                ...result.properties,
                ...params.properties,
            };
        }
        return result;
    }
    /**
     * @param {string} objectId
     * @returns {Promise<void>}
     */
    async deleteObject(objectId) {
        await this.ensureConnected();
        const { classId, numericId } = parseObjectRef(objectId);
        const closeInfo = CLASS_ID_TO_CLOSE_ACTION[classId];
        if (!closeInfo) {
            throw new Error(`Cannot delete object of class ${classId}`);
        }
        let pObject = this.objectCache.get(objectId);
        if (!pObject) {
            pObject = await this.openWithKnownType(numericId, classId);
            this.objectCache.set(objectId, pObject);
        }
        this.attachTo(pObject);
        const parentClassId = pObject.wClass_Parent;
        const parentNumericId = pObject.twParentIx;
        const parentPrefixedId = parentClassId && parentNumericId
            ? formatObjectRef(parentClassId, parentNumericId)
            : null;
        let pParent = parentPrefixedId ? this.objectCache.get(parentPrefixedId) : null;
        if (!pParent && parentPrefixedId) {
            pParent = await this.openWithKnownType(parentNumericId, parentClassId);
            this.objectCache.set(parentPrefixedId, pParent);
        }
        if (!pParent) {
            throw new Error(`Cannot find parent for object ${objectId}`);
        }
        this.attachTo(pParent);
        const startedAt = Date.now();
        const response = await this.sendAction(pParent, closeInfo.action, (payload) => {
            payload[closeInfo.idField] = numericId;
            payload.bDeleteAll = 0;
        });
        if (response.nResult !== 0) {
            throw new Error(this.formatResponseError('Failed to delete object', response));
        }
        await this._confirmMutation((event) => {
            if (event.kind !== 'deleted' || event.classId !== classId || event.objectId !== numericId) {
                return false;
            }
            if (event.parentClassId == null || event.parentObjectId == null) {
                return true;
            }
            return event.parentClassId === parentClassId &&
                event.parentObjectId === parentNumericId;
        }, `delete object ${objectId}`, undefined, startedAt);
        this.objectCache.delete(objectId);
    }
    /**
     * @param {string} objectId
     * @param {string} newParentId
     * @param {boolean} [skipRefetch]
     * @returns {Promise<FabricObject>}
     */
    async moveObject(objectId, newParentId, skipRefetch) {
        await this.ensureConnected();
        const { classId, numericId } = parseObjectRef(objectId);
        const { classId: newParentClassId, numericId: newParentNumericId } = parseObjectRef(newParentId);
        let pObject = this.objectCache.get(objectId);
        if (!pObject) {
            pObject = await this.openWithKnownType(numericId, classId);
            this.objectCache.set(objectId, pObject);
        }
        this.attachTo(pObject);
        let pNewParent = this.objectCache.get(newParentId);
        if (!pNewParent) {
            pNewParent = await this.openWithKnownType(newParentNumericId, newParentClassId);
            this.objectCache.set(newParentId, pNewParent);
        }
        this.attachTo(pNewParent);
        const oldParentClassId = pObject.wClass_Parent;
        const oldParentNumericId = pObject.twParentIx;
        const oldParentId = oldParentClassId && oldParentNumericId
            ? formatObjectRef(oldParentClassId, oldParentNumericId)
            : null;
        const startedAt = Date.now();
        const response = await this.sendAction(pObject, 'PARENT', (payload) => {
            payload.wClass = newParentClassId;
            payload.twObjectIx = newParentNumericId;
        });
        if (response.nResult !== 0) {
            throw new Error(this.formatResponseError('Failed to move object', response));
        }
        await this._confirmMutation((event) => {
            if (event.timestamp < startedAt) {
                return false;
            }
            const missingParentMetadata = event.parentClassId == null || event.parentObjectId == null;
            const deletedFromOldParent = event.kind === 'deleted' &&
                event.classId === classId &&
                event.objectId === numericId &&
                (missingParentMetadata || (event.parentClassId === oldParentClassId &&
                    event.parentObjectId === oldParentNumericId));
            const insertedIntoNewParent = event.kind === 'inserted' &&
                event.childClassId === classId &&
                event.childObjectId === numericId &&
                (missingParentMetadata || (event.parentClassId === newParentClassId &&
                    event.parentObjectId === newParentNumericId));
            return deletedFromOldParent || insertedIntoNewParent;
        }, `move object ${objectId} -> ${newParentId}`, undefined, startedAt);
        // Model fields may be getter-only; force subsequent reads/writes to reopen authoritative state.
        this.objectCache.delete(objectId);
        if (skipRefetch) {
            return {
                id: objectId,
                parentId: newParentId,
                name: this.getObjectName(pObject),
                transform: {
                    position: { x: pObject.pTransform?.vPosition?.dX ?? 0, y: pObject.pTransform?.vPosition?.dY ?? 0, z: pObject.pTransform?.vPosition?.dZ ?? 0 },
                    rotation: { x: pObject.pTransform?.qRotation?.dX ?? 0, y: pObject.pTransform?.qRotation?.dY ?? 0, z: pObject.pTransform?.qRotation?.dZ ?? 0, w: pObject.pTransform?.qRotation?.dW ?? 1 },
                    scale: { x: pObject.pTransform?.vScale?.dX ?? 1, y: pObject.pTransform?.vScale?.dY ?? 1, z: pObject.pTransform?.vScale?.dZ ?? 1 },
                },
                resourceReference: pObject.pResource?.sReference || null,
                resourceName: pObject.pResource?.sName || null,
                bound: null,
                classId: pObject.wClass_Object,
                type: pObject.pType?.bType ?? 0,
                subtype: pObject.pType?.bSubtype ?? 0,
                isAttachmentPoint: (pObject.pType?.bSubtype ?? 0) === 255,
                children: null,
            };
        }
        return this.getObject(objectId);
    }
    /**
     * @param {BulkOperation[]} operations
     * @param {BulkUpdateOptions} [options]
     * @param {number} [options.concurrency=10] Max concurrent operations (1-100)
     * @param {'await'|'optimistic'} [options.confirmMode='await'] "optimistic" skips mutation confirmation wait
     * @returns {Promise<{ success: number; failed: number; createdIds: string[]; errors: string[]; results: Array<{status: 'ok', id?: string, confirmed?: boolean} | {status: 'error', message: string}> }>}
     */
    async bulkUpdate(operations, options = {}) {
        let success = 0;
        let failed = 0;
        const createdIds = [];
        const errors = [];
        const concurrency = Math.max(1, Math.min(100, options?.concurrency ?? 10));
        const skipConfirmation = options?.confirmMode === 'optimistic';
        // Scale mutation timeout based on batch size to avoid false timeouts
        // under load. Each wave of concurrency ops adds 500ms, capped at +30s.
        const waves = Math.ceil(operations.length / concurrency);
        const scaledTimeoutMs = this.promiseTimeoutMs + Math.min(waves * 500, 30000);
        debugLog(`[bulkUpdate] concurrency=${concurrency} confirmMode=${options?.confirmMode ?? 'await'} scaled timeout: ${this.promiseTimeoutMs}ms -> ${scaledTimeoutMs}ms for ${operations.length} ops (${waves} waves)`);
        // Pre-fetch all referenced objects so concurrent ops don't race
        const idsToPreload = new Set();
        for (const op of operations) {
            switch (op.type) {
                case 'create':
                    idsToPreload.add(op.params.parentId);
                    break;
                case 'update':
                    idsToPreload.add(op.params.objectId);
                    break;
                case 'delete':
                    idsToPreload.add(op.params.objectId);
                    break;
                case 'move': {
                    const p = op.params;
                    idsToPreload.add(p.objectId);
                    idsToPreload.add(p.newParentId);
                    break;
                }
            }
        }
        // Remove "root" and IDs already cached
        for (const id of idsToPreload) {
            if (id === 'root' || this.objectCache.has(id))
                idsToPreload.delete(id);
        }
        const prefetchFailed = new Set();
        if (idsToPreload.size > 0) {
            debugLog(`[bulkUpdate] pre-fetching ${idsToPreload.size} objects`);
            for (const id of idsToPreload) {
                try {
                    const { classId, numericId } = parseObjectRef(id);
                    const pObj = await this.openWithKnownType(numericId, classId);
                    this.objectCache.set(id, pObj);
                }
                catch (err) {
                    debugLog(`[bulkUpdate] pre-fetch failed for ${id}: ${err.message}`);
                    prefetchFailed.add(id);
                }
            }
        }
        const getFailedId = (op) => {
            const ids = op.type === 'create' ? [op.params.parentId]
                : op.type === 'move' ? [op.params.objectId, op.params.newParentId]
                : [op.params.objectId];
            return ids.find(id => prefetchFailed.has(id));
        };
        const executeOp = async (op) => {
            const badId = getFailedId(op);
            if (badId) {
                throw new Error(`Object not found: ${badId}`);
            }
            switch (op.type) {
                case 'create': {
                    const createParams = op.params;
                    const obj = await this.createObject({ ...createParams, skipParentRefetch: true, tolerateTimeout: true, mutationTimeoutMs: scaledTimeoutMs, skipConfirmation });
                    return { id: obj.id, confirmed: obj.confirmed };
                }
                case 'update':
                    await this.updateObject({ ...op.params, skipRefetch: true });
                    return null;
                case 'delete':
                    await this.deleteObject(op.params.objectId);
                    return null;
                case 'move': {
                    const moveParams = op.params;
                    const pObj = this.objectCache.get(moveParams.objectId);
                    const oldParentClassId = pObj?.wClass_Parent;
                    const oldParentNumericId = pObj?.twParentIx;
                    const oldParentId = oldParentClassId && oldParentNumericId
                        ? formatObjectRef(oldParentClassId, oldParentNumericId)
                        : null;
                    await this.moveObject(moveParams.objectId, moveParams.newParentId, true);
                    return null;
                }
            }
        };
        // Sliding window: start new op as soon as any slot frees up.
        // Note: results[i] preserves positional order (results[i] ↔ operations[i]).
        // createdIds is in completion order, not positional — use results[i].id for positional mapping.
        const results = new Array(operations.length);
        let nextIdx = 0;
        const inFlight = new Map();
        const launchNext = () => {
            if (nextIdx >= operations.length) return;
            const idx = nextIdx++;
            const op = operations[idx];
            const p = executeOp(op)
                .then(value => {
                    success++;
                    if (value?.id) {
                        createdIds.push(value.id);
                        results[idx] = { status: 'ok', id: value.id, confirmed: value.confirmed };
                    }
                    else {
                        results[idx] = { status: 'ok' };
                    }
                })
                .catch(err => {
                    failed++;
                    const message = `${op.type} failed: ${err?.message || 'unknown error'}`;
                    errors.push(message);
                    results[idx] = { status: 'error', message };
                })
                .finally(() => {
                    inFlight.delete(p);
                });
            inFlight.set(p, idx);
        };
        // Fill initial window
        for (let i = 0; i < concurrency && i < operations.length; i++) {
            launchNext();
        }
        // As each completes, launch the next
        while (inFlight.size > 0) {
            await Promise.race(inFlight.keys());
            while (inFlight.size < concurrency && nextIdx < operations.length) {
                launchNext();
            }
        }
        return { success, failed, createdIds, errors, results: [...results] };
    }
    async loadFullTree(scopeId) {
        if (!this.objectCache.has(scopeId)) {
            const { classId, numericId } = parseObjectRef(scopeId);
            const pScene = await this.openWithKnownType(numericId, classId);
            this.objectCache.set(scopeId, pScene);
        }
        const objects = [];
        const seenIds = new Set();
        const collectObjects = async (pObject) => {
            const prefixedId = this.getPrefixedId(pObject);
            if (seenIds.has(prefixedId))
                return;
            seenIds.add(prefixedId);
            objects.push(this.rmxToFabricObject(pObject));
            const children = [];
            this.enumAllChildTypes(pObject, (child) => {
                children.push(child);
            });
            const unopened = children.filter(c => {
                const childPrefixedId = this.getPrefixedId(c);
                return !seenIds.has(childPrefixedId) && !this.objectCache.has(childPrefixedId);
            });
            await Promise.all(unopened.map(child => this.openWithKnownType(child.twObjectIx, child.wClass_Object).catch(() => { })));
            await Promise.all(children.map(child => collectObjects(child)));
        };
        const pScene = this.objectCache.get(scopeId);
        if (pScene) {
            await collectObjects(pScene);
        }
        return objects;
    }
    latLonToWorldCoords(lat, lon, radius = EARTH_RADIUS_METERS) {
        return latLonToWorldCoords(lat, lon, radius);
    }
    buildGeoMatrix(lat, lon, radius = EARTH_RADIUS_METERS) {
        return buildGeoMatrix(lat, lon, radius);
    }
    getSectorSubtypeRule(diameterKm) {
        return getSectorSubtypeRule(diameterKm);
    }
    async reverseGeocode(lat, lon) {
        if (typeof fetch !== 'function') {
            return null;
        }
        const controller = typeof AbortController === 'function' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS) : null;
        try {
            const url = new URL(NOMINATIM_ENDPOINT);
            url.searchParams.set('lat', String(lat));
            url.searchParams.set('lon', String(lon));
            url.searchParams.set('format', 'json');
            url.searchParams.set('zoom', '10');
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'ManifolderClient/0.1.0',
                    'Accept': 'application/json',
                },
                signal: controller?.signal,
            });
            if (!response.ok) {
                return null;
            }
            const payload = await response.json();
            const address = payload?.address;
            if (!address) {
                return null;
            }
            const city = address.city || address.town || address.village || address.municipality || address.hamlet;
            const community = address.suburb || address.neighbourhood || address.city_district || address.quarter;
            const county = address.county || address.state_district;
            const state = address.state || address.region;
            const country = address.country;
            if (!city && !community && !county && !state && !country) {
                return null;
            }
            return { city, community, county, state, country };
        }
        catch {
            return null;
        }
        finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }
    computeCampusGeometry(params, radius = EARTH_RADIUS_METERS) {
        const hasNodes = Array.isArray(params.nodes) && params.nodes.length > 0;
        if (!hasNodes && !(typeof params.lat === 'number' && typeof params.lon === 'number' && typeof params.boundX === 'number' && typeof params.boundZ === 'number')) {
            throw new Error('Either lat + lon + boundX + boundZ, or nodes, must be provided');
        }
        if (hasNodes && (typeof params.boundX === 'number' || typeof params.boundZ === 'number')) {
            throw new Error('Provide either nodes or boundX/boundZ, not both');
        }
        if (hasNodes && params.nodes.length < 2) {
            throw new Error('nodes must include at least 2 entries');
        }
        const validateLatLon = (lat, lon) => {
            if (lat < -90 || lat > 90) {
                throw new Error(`Latitude out of range: ${lat}`);
            }
            if (lon < -180 || lon > 180) {
                throw new Error(`Longitude out of range: ${lon}`);
            }
        };
        if (typeof params.lat === 'number' && typeof params.lon === 'number') {
            validateLatLon(params.lat, params.lon);
        }
        if (hasNodes) {
            for (const node of params.nodes) {
                validateLatLon(node.lat, node.lon);
            }
        }
        if (!hasNodes) {
            const halfX = params.boundX;
            const halfZ = params.boundZ;
            const maxExtentKm = Math.max(halfX, halfZ) * 2 / 1000;
            if (maxExtentKm < 0.1) {
                throw new Error('Campus extent must be at least 0.1 km');
            }
            const rule = this.getSectorSubtypeRule(maxExtentKm);
            const sectorHeight = params.boundY ?? rule.height;
            const sectorDepth = rule.depth;
            const bounds = computeSectorBounds(halfX, halfZ, sectorHeight, sectorDepth, radius);
            return {
                latitude: params.lat,
                longitude: params.lon,
                radius: bounds.adjustedRadius,
                boundX: bounds.boundX,
                boundY: bounds.boundY,
                boundZ: bounds.boundZ,
                containmentBound: { x: halfX, y: sectorHeight, z: halfZ },
                height: sectorHeight,
                depth: sectorDepth,
                sectorSubtype: rule.subtype,
            };
        }
        let latMin = Number.POSITIVE_INFINITY;
        let latMax = Number.NEGATIVE_INFINITY;
        let lonMin = Number.POSITIVE_INFINITY;
        let lonMax = Number.NEGATIVE_INFINITY;
        const worldNodes = params.nodes.map((node) => {
            latMin = Math.min(latMin, node.lat);
            latMax = Math.max(latMax, node.lat);
            lonMin = Math.min(lonMin, node.lon);
            lonMax = Math.max(lonMax, node.lon);
            return {
                latitude: node.lat,
                longitude: node.lon,
                ...latLonToWorldCoords(node.lat, node.lon, radius),
            };
        });
        let latMid = (latMin + latMax) / 2;
        let lonMid;
        if ((lonMax - lonMin) > 270) {
            const positiveLongitudes = params.nodes.filter((node) => node.lon >= 0).map((node) => node.lon);
            const negativeLongitudes = params.nodes.filter((node) => node.lon < 0).map((node) => node.lon);
            lonMin = Math.min(...positiveLongitudes);
            lonMax = Math.max(...negativeLongitudes);
            lonMid = normalizeLongitude((lonMin + lonMax + 360) / 2);
        }
        else {
            lonMid = (lonMin + lonMax) / 2;
        }
        let localExtents = null;
        for (let iteration = 0; iteration < 10; iteration += 1) {
            const matrices = this.buildGeoMatrix(latMid, lonMid, radius);
            const localNodes = worldNodes.map((node) => transformPoint(matrices.inverse, node));
            const xValues = localNodes.map((node) => node.x);
            const yValues = localNodes.map((node) => node.y);
            const zValues = localNodes.map((node) => node.z);
            const xMin = Math.min(...xValues);
            const xMax = Math.max(...xValues);
            const yMin = Math.min(...yValues);
            const yMax = Math.max(...yValues);
            const zMin = Math.min(...zValues);
            const zMax = Math.max(...zValues);
            const xMid = (xMin + xMax) / 2;
            const zMid = (zMin + zMax) / 2;
            localExtents = { xMin, xMax, yMin, yMax, zMin, zMax };
            if (Math.abs(xMid) <= 0.000001 && Math.abs(zMid) <= 0.000001) {
                break;
            }
            const adjustedLocal = { x: xMid * 0.97, y: 0, z: zMid * 0.97 };
            const worldOffset = transformPoint(matrices.forward, adjustedLocal);
            const ySign = worldOffset.y < 0 ? -1 : 1;
            const projectedY = Math.sqrt(Math.max(0, (radius * radius) - (worldOffset.x * worldOffset.x) - (worldOffset.z * worldOffset.z))) * ySign;
            const nextGeo = worldCoordsToLatLon({ x: worldOffset.x, y: projectedY, z: worldOffset.z }, radius);
            latMid = nextGeo.latitude;
            lonMid = nextGeo.longitude;
        }
        const rawDiameterKm = Math.max(localExtents.xMax - localExtents.xMin, localExtents.zMax - localExtents.zMin) / 1000;
        const rule = this.getSectorSubtypeRule(rawDiameterKm);
        const halfX = (localExtents.xMax - localExtents.xMin) / 2;
        const halfZ = (localExtents.zMax - localExtents.zMin) / 2;
        const bounds = computeSectorBounds(halfX, halfZ, rule.height, rule.depth, radius);
        return {
            latitude: latMid,
            longitude: lonMid,
            radius: bounds.adjustedRadius,
            boundX: bounds.boundX,
            boundY: bounds.boundY,
            boundZ: bounds.boundZ,
            containmentBound: { x: halfX, y: rule.height, z: halfZ },
            height: rule.height,
            depth: rule.depth,
            sectorSubtype: rule.subtype,
        };
    }
    async resolveTerrestrialRootObjectId() {
        await this.ensureConnected();
        if (this.pRMRoot?.wClass_Object === ClassIds.RMTObject &&
            this.pRMRoot?.pType?.bType === ObjectTypeMap['terrestrial:root'].type) {
            return this.getPrefixedId(this.pRMRoot);
        }
        const scenes = await this.listScenes();
        for (const scene of scenes) {
            if (scene.classId !== ClassIds.RMTObject) {
                continue;
            }
            const obj = await this.getObject(scene.id);
            if (obj.classId === ClassIds.RMTObject && obj.type === ObjectTypeMap['terrestrial:root'].type) {
                return obj.id;
            }
        }
        throw new Error('Unable to locate terrestrial:root in current scope');
    }
    async loadPathWithWorldPositions(object, ancestry) {
        const ancestors = [...(ancestry ?? [])].sort((a, b) => (b.ancestorDepth ?? 0) - (a.ancestorDepth ?? 0));
        const chain = [];
        for (const ancestor of ancestors) {
            const loaded = await this.getObject(ancestor.objectId);
            chain.push({ object: loaded, worldMatrix: null, inverseWorldMatrix: null });
        }
        chain.push({ object, worldMatrix: null, inverseWorldMatrix: null });
        while (chain[0]?.object?.parentId && chain[0].object.parentId !== 'root') {
            const parent = await this.getObject(chain[0].object.parentId);
            chain.unshift({ object: parent, worldMatrix: null, inverseWorldMatrix: null });
        }
        for (let index = 0; index < chain.length; index += 1) {
            const current = chain[index];
            const relativeMatrix = objectToRelativeMatrix(current.object);
            if (index === 0) {
                current.worldMatrix = relativeMatrix;
            }
            else {
                current.worldMatrix = multiplyMatrices(chain[index - 1].worldMatrix, relativeMatrix);
            }
            current.inverseWorldMatrix = invertMatrix(current.worldMatrix);
        }
        return chain;
    }
    disambiguateSearchResults(results, names = {}) {
        if (results.length <= 1) {
            return results[0] ?? null;
        }
        const scored = results.map((result, index) => {
            const nodes = [result.object, ...(result.ancestry ?? [])];
            let score = 0;
            for (const field of TERRESTRIAL_GEO_FIELDS) {
                const expectedName = names[field];
                if (!expectedName) {
                    continue;
                }
                const expectedType = ObjectTypeMap[`terrestrial:${field}`]?.type;
                const match = nodes.some((node) => node.classId === ClassIds.RMTObject &&
                    node.type === expectedType &&
                    node.name.toLowerCase() === expectedName.toLowerCase());
                if (match) {
                    score += 1;
                }
            }
            return { result, score, index };
        });
        scored.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            const aDistance = a.result.arcDistance ?? Number.POSITIVE_INFINITY;
            const bDistance = b.result.arcDistance ?? Number.POSITIVE_INFINITY;
            if (aDistance !== bDistance) {
                return aDistance - bDistance;
            }
            return a.index - b.index;
        });
        return scored[0]?.result ?? null;
    }
    filterSearchResultsByExactName(results, searchText) {
        const expectedName = normalizeSearchName(searchText);
        if (!expectedName) {
            return results;
        }
        const exactMatches = results.filter((result) => normalizeSearchName(result?.object?.name) === expectedName);
        return exactMatches.length > 0 ? exactMatches : results;
    }
    async collectCandidateParents(path, lowestContainingIndex, campusWorldPos, campusBound) {
        const candidates = [];
        const lowestContaining = path[lowestContainingIndex];
        const parentEntry = lowestContainingIndex > 0 ? path[lowestContainingIndex - 1] : null;
        if (parentEntry) {
            const refreshedParent = await this.getObject(parentEntry.object.id);
            const pCached = this.objectCache.get(parentEntry.object.id) ?? this.objectCache.get(refreshedParent.id);
            this.enumAllChildTypes(pCached, (child) => {
                const childObj = this.rmxToFabricObject(child);
                const { inverseWorldMatrix } = computeChildMatrices(childObj, parentEntry.worldMatrix);
                const localPoint = transformPoint(inverseWorldMatrix, campusWorldPos);
                if (pointInLocalBounds(localPoint, childObj.bound) && hasCampusSize(childObj.bound, campusBound)) {
                    candidates.push(childObj);
                }
            });
            if (hasCampusSize(refreshedParent.bound, campusBound)) {
                candidates.push(refreshedParent);
            }
        }
        else {
            const localPoint = transformPoint(lowestContaining.inverseWorldMatrix, campusWorldPos);
            if (pointInLocalBounds(localPoint, lowestContaining.object.bound)
                && hasCampusSize(lowestContaining.object.bound, campusBound)) {
                candidates.push(lowestContaining.object);
            }
        }
        candidates.sort((a, b) => getBoundArea(a.bound) - getBoundArea(b.bound));
        return [...new Map(candidates.map((candidate) => [candidate.id, candidate])).values()];
    }
    async walkDownToSmallestContainingNode(startEntry, campusWorldPos, campusBound, preferredPathOrder = new Map()) {
        let current = startEntry;
        while (true) {
            const refreshedCurrent = await this.getObject(current.object.id);
            const childEntries = [];
            this.enumAllChildTypes(this.objectCache.get(current.object.id) ?? this.objectCache.get(refreshedCurrent.id), (child) => {
                const childObj = this.rmxToFabricObject(child);
                const childMatrices = computeChildMatrices(childObj, current.worldMatrix);
                const localPoint = transformPoint(childMatrices.inverseWorldMatrix, campusWorldPos);
                if (campusFitsInLocalBounds(localPoint, campusBound, childObj.bound)) {
                    childEntries.push({ object: childObj, worldMatrix: childMatrices.worldMatrix, inverseWorldMatrix: childMatrices.inverseWorldMatrix });
                }
            });
            if (childEntries.length === 0) {
                return refreshedCurrent;
            }
            sortContainingEntriesBySurfaceDistance(childEntries, campusWorldPos, preferredPathOrder);
            current = childEntries[0];
        }
    }
    async walkDownFromStructuralRoot(startEntry, campusWorldPos, campusBound, preferredPathOrder = new Map()) {
        let current = startEntry;
        const startLocalPoint = transformPoint(current.inverseWorldMatrix, campusWorldPos);
        let currentFitsCampus = campusFitsInLocalBounds(startLocalPoint, campusBound, current.object.bound);
        while (true) {
            const refreshedCurrent = await this.getObject(current.object.id);
            const pCached = this.objectCache.get(current.object.id) ?? this.objectCache.get(refreshedCurrent.id);
            const pointContaining = [];
            const exactFits = [];
            this.enumAllChildTypes(pCached, (child) => {
                const childObj = this.rmxToFabricObject(child);
                const childMatrices = computeChildMatrices(childObj, current.worldMatrix);
                const localPoint = transformPoint(childMatrices.inverseWorldMatrix, campusWorldPos);
                if (!pointInLocalBounds(localPoint, childObj.bound)) {
                    return;
                }
                const entry = { object: childObj, worldMatrix: childMatrices.worldMatrix, inverseWorldMatrix: childMatrices.inverseWorldMatrix };
                pointContaining.push(entry);
                if (campusFitsInLocalBounds(localPoint, campusBound, childObj.bound)) {
                    exactFits.push(entry);
                }
            });
            if (exactFits.length > 0) {
                sortContainingEntriesBySurfaceDistance(exactFits, campusWorldPos, preferredPathOrder);
                current = exactFits[0];
                currentFitsCampus = true;
                continue;
            }
            if (currentFitsCampus) {
                return { parent: refreshedCurrent, candidates: [] };
            }
            if (pointContaining.length === 0) {
                throw new Error('No ancestor contains the target point');
            }
            const candidates = pointContaining
                .filter((entry) => hasCampusSize(entry.object.bound, campusBound));
            sortContainingEntriesBySurfaceDistance(candidates, campusWorldPos, preferredPathOrder);
            if (candidates.length > 0) {
                return {
                    parent: null,
                    candidates: [...new Map(candidates.map((entry) => [entry.object.id, entry.object])).values()],
                };
            }
            throw new Error('No ancestor has bounds large enough for the campus');
        }
    }
    async findSmallestContainingNode(startObject, ancestry, campusWorldPos, campusBound, preferredPathIds = []) {
        const path = await this.loadPathWithWorldPositions(startObject, ancestry);
        const preferredPathOrder = new Map(preferredPathIds.map((objectId, index) => [objectId, index]));
        let exactFitIndex = -1;
        let lowestContainingIndex = -1;
        for (let index = path.length - 1; index >= 0; index -= 1) {
            const entry = path[index];
            const localPoint = transformPoint(entry.inverseWorldMatrix, campusWorldPos);
            if (pointInLocalBounds(localPoint, entry.object.bound)) {
                if (lowestContainingIndex === -1) {
                    lowestContainingIndex = index;
                }
                if (exactFitIndex === -1 && campusFitsInLocalBounds(localPoint, campusBound, entry.object.bound)) {
                    exactFitIndex = index;
                }
            }
        }
        if (exactFitIndex !== -1) {
            const smallest = await this.walkDownToSmallestContainingNode(path[exactFitIndex], campusWorldPos, campusBound, preferredPathOrder);
            return { parent: smallest, candidates: [] };
        }
        if (lowestContainingIndex === -1) {
            if (path.length === 1 && startObject.parentId === 'root') {
                return this.walkDownFromStructuralRoot(path[0], campusWorldPos, campusBound, preferredPathOrder);
            }
            throw new Error('No ancestor contains the target point');
        }
        const candidates = await this.collectCandidateParents(path, lowestContainingIndex, campusWorldPos, campusBound);
        if (candidates.length === 0) {
            throw new Error('No ancestor has bounds large enough for the campus');
        }
        return { parent: null, candidates };
    }
    /**
     * @param {string | undefined} anchorObjectId
     * @param {FindEarthAttachmentParentParams} params
     * @returns {Promise<EarthAttachmentParentResult>}
     */
    async findEarthAttachmentParent(anchorObjectId, params) {
        await this.ensureConnected();
        const anchorId = anchorObjectId ?? await this.resolveTerrestrialRootObjectId();
        const geometry = this.computeCampusGeometry(params, EARTH_RADIUS_METERS);
        const providedNames = {
            city: params.city,
            community: params.community,
            county: params.county,
            state: params.state,
            country: params.country,
        };
        const reverseGeocode = await this.reverseGeocode(geometry.latitude, geometry.longitude);
        const geocode = mergeResolvedGeocode(reverseGeocode, providedNames);
        const worldCoords = this.latLonToWorldCoords(geometry.latitude, geometry.longitude, EARTH_RADIUS_METERS);
        const searchText = providedNames.community || providedNames.city || providedNames.county || providedNames.state || providedNames.country
            || geocode.community || geocode.city || geocode.county || geocode.state || geocode.country;
        let preferredPathIds = [];
        let selectedResult = null;
        if (searchText) {
            const searchResults = await this.serverSearch(anchorId, {
                namePattern: searchText,
                positionRadius: { center: worldCoords, radius: 0 },
            }, { includeAncestry: true });
            if (searchResults.length > 0) {
                const narrowedResults = this.filterSearchResultsByExactName(searchResults, searchText);
                selectedResult = this.disambiguateSearchResults(narrowedResults, geocode);
                preferredPathIds = buildPreferredPathIds(selectedResult);
            }
        }
        const rootObject = await this.getObject(anchorId);
        const startObject = selectedResult?.object ? await this.getObject(selectedResult.object.id) : rootObject;
        const resolution = await this.findSmallestContainingNode(startObject, selectedResult?.ancestry ?? [], worldCoords, geometry.containmentBound, preferredPathIds);
        return {
            parent: resolution.parent ? toAttachmentParentInfo(resolution.parent) : null,
            candidates: resolution.parent ? undefined : resolution.candidates.map((candidate) => toAttachmentParentInfo(candidate)),
            sectorSubtype: geometry.sectorSubtype,
            attachment: {
                latitude: geometry.latitude,
                longitude: geometry.longitude,
                radius: geometry.radius,
                boundX: geometry.boundX,
                boundY: geometry.boundY,
                boundZ: geometry.boundZ,
                height: geometry.height,
                depth: geometry.depth,
            },
            planet: (() => {
                const matrices = this.buildGeoMatrix(geometry.latitude, geometry.longitude, geometry.radius);
                return {
                    radius: geometry.radius,
                    matrix: matrices.forward,
                    matrixInverse: matrices.inverse,
                    subsurface: { tnGeometry: 3, dA: geometry.latitude, dB: geometry.longitude, dC: geometry.radius },
                };
            })(),
            geocode,
        };
    }
    /**
     * @param {string | undefined} anchorObjectId
     * @param {SearchQuery} query
     * @returns {Promise<FabricObject[]>}
     */
    async findObjects(anchorObjectId, query) {
        await this.ensureConnected();
        if (query.namePattern) {
            return this.serverSearch(anchorObjectId, query);
        }
        const resolvedAnchorId = anchorObjectId ?? await this.resolveTerrestrialRootObjectId();
        const allObjects = await this.loadFullTree(resolvedAnchorId);
        return allObjects.filter(obj => {
            if (query.resourceUrl && obj.resourceReference !== query.resourceUrl)
                return false;
            if (query.positionRadius) {
                const { center, radius } = query.positionRadius;
                const pos = obj.transform.position;
                const dist = Math.sqrt(Math.pow(pos.x - center.x, 2) +
                    Math.pow(pos.y - center.y, 2) +
                    Math.pow(pos.z - center.z, 2));
                if (dist > radius)
                    return false;
            }
            return true;
        });
    }
    async serverSearch(anchorObjectId, query, options = {}) {
        const resolvedAnchorId = anchorObjectId ?? await this.resolveTerrestrialRootObjectId();
        let pScene = this.objectCache.get(resolvedAnchorId);
        if (!pScene) {
            const { classId, numericId } = parseObjectRef(resolvedAnchorId);
            pScene = await this.openWithKnownType(numericId, classId);
            this.objectCache.set(resolvedAnchorId, pScene);
        }
        const response = await this.sendAction(pScene, 'SEARCH', (p) => {
            if (pScene.sID === 'RMCObject') {
                p.twRMCObjectIx = pScene.twObjectIx;
            }
            else {
                p.twRMTObjectIx = pScene.twObjectIx;
            }
            p.dX = query.positionRadius?.center.x ?? 0;
            p.dY = query.positionRadius?.center.y ?? 0;
            p.dZ = query.positionRadius?.center.z ?? 0;
            p.sText = query.namePattern.toLowerCase();
        });
        if (response.nResult === -1) {
            throw new Error('Search is not supported on this server. Use get_object to browse the hierarchy manually.');
        }
        if (response.nResult !== 0) {
            throw new Error(this.formatResponseError('Search failed', response));
        }
        const results = [];
        const resultSet = response.aResultSet?.[0] || [];
        const ancestryByOrder = buildAncestorMap(response.aResultSet?.[1] || []);
        for (let index = 0; index < resultSet.length; index += 1) {
            const item = resultSet[index];
            const objectIx = item.ObjectHead_twObjectIx;
            const classId = item.ObjectHead_wClass_Object;
            if (!objectIx || !classId)
                continue;
            const resultObjectId = formatObjectRef(classId, objectIx);
            try {
                const obj = await this.getObject(resultObjectId);
                if (options.includeAncestry) {
                    results.push({
                        object: obj,
                        ancestry: ancestryByOrder.get(item.nOrder ?? index) ?? ancestryByOrder.get(index) ?? [],
                        arcDistance: item.dArc ?? item.dArcLength ?? item.ArcLength ?? null,
                    });
                }
                else {
                    results.push(obj);
                }
            }
            catch {
                // Skip objects we can't open
            }
        }
        return results;
    }
    async ensureConnected() {
        if (this.connected)
            return;
        if (this.fabricUrl && this.adminKey != null) {
            await this.connect(this.fabricUrl, this.adminKey);
            return;
        }
        throw new Error('Not connected. Call connect() or connectRoot() first.');
    }
    static TERM_SUBSTITUTIONS = [
        [/\bRMCObject\b/gi, 'celestial'],
        [/\bRMTObject\b/gi, 'terrestrial'],
        [/\bRMPObject\b/gi, 'physical'],
        [/\bRMRoot\b/gi, 'root'],
        [/\btwRMCObjectIx_Close\b/g, 'celestial object'],
        [/\btwRMTObjectIx_Close\b/g, 'terrestrial object'],
        [/\btwRMPObjectIx_Close\b/g, 'physical object'],
        [/\btwRMCObjectIx\b/g, 'celestial object ID'],
        [/\btwRMTObjectIx\b/g, 'terrestrial object ID'],
        [/\btwRMPObjectIx\b/g, 'physical object ID'],
        [/\btwRMRootIx\b/g, 'root ID'],
        [/\btwRPersonaIx\b/g, 'session ID'],
        [/\bType_bType\b/g, 'objectType'],
        [/\bType_bSubtype\b/g, 'objectSubtype'],
        [/\bType_bFiction\b/g, 'fiction flag'],
        [/\bType_bMovable\b/g, 'movable flag'],
        [/\bwClass\b/g, 'object class'],
        [/\bSURFACE\b/g, 'celestial:surface'],
        [/\bPARCEL\b/g, 'terrestrial:parcel'],
        [/\bRMCOBJECT_OPEN\b/g, 'create celestial child'],
        [/\bRMTOBJECT_OPEN\b/g, 'create terrestrial child'],
        [/\bRMPOBJECT_OPEN\b/g, 'create physical child'],
        [/\bRMCOBJECT_CLOSE\b/g, 'delete celestial child'],
        [/\bRMTOBJECT_CLOSE\b/g, 'delete terrestrial child'],
        [/\bRMPOBJECT_CLOSE\b/g, 'delete physical child'],
    ];
    static ERROR_REWRITES = [
        [/Parent's Type_bType must be equal to SURFACE when its parent's class is RMCOBJECT/,
            'celestial:surface is the only celestial type that accepts terrestrial children'],
        [/Parent's Type_bType must be equal to PARCEL when its parent's class is RMTOBJECT/,
            'terrestrial:parcel is the only terrestrial type that accepts physical children'],
    ];
    translateError(raw) {
        for (const [pattern, replacement] of SingleScopeClient.ERROR_REWRITES) {
            if (pattern.test(raw))
                return replacement;
        }
        let translated = raw;
        for (const [pattern, replacement] of SingleScopeClient.TERM_SUBSTITUTIONS) {
            translated = translated.replace(pattern, replacement);
        }
        return translated;
    }
    formatResponseError(operation, response) {
        const details = [];
        const resultSet = response.aResultSet?.[0];
        if (Array.isArray(resultSet)) {
            for (const row of resultSet) {
                if (row?.sError) {
                    details.push(this.translateError(row.sError));
                }
            }
        }
        const suffix = details.length > 0 ? `: ${details.join('; ')}` : '';
        return `${operation}: error ${response.nResult}${suffix}`;
    }
    sendAction(pObject, actionName, fillPayload, timeoutMs = 30000) {
        const pIAction = pObject.Request(actionName);
        if (!pIAction) {
            const message = actionName === 'SEARCH'
                ? 'Search is only available for celestial or terrestrial roots'
                : `Cannot ${this.translateError(actionName)} under this parent type`;
            return Promise.reject(new Error(message));
        }
        fillPayload(pIAction.pRequest);
        return this._sendAction(pIAction, timeoutMs).catch((err) => {
            if (err?.message === 'Request timeout') {
                throw new Error(`Timeout waiting for ${actionName} action response`);
            }
            throw err;
        });
    }
    _sendAction(pIAction, timeoutMs = 30000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => reject(new Error('Request timeout')), timeoutMs);
            pIAction.Send(this, (action) => {
                clearTimeout(timeoutId);
                resolve(action.pResponse);
            });
        });
    }
    getChildIds(pObject) {
        const childIds = [];
        this.enumAllChildTypes(pObject, (child) => {
            if (child?.twObjectIx && child?.wClass_Object) {
                childIds.push(formatObjectRef(child.wClass_Object, child.twObjectIx));
            }
        });
        return childIds;
    }
    /**
     * @param {any} rmx
     * @returns {FabricObject}
     */
    rmxToFabricObject(rmx) {
        const id = this.getPrefixedId(rmx);
        const name = this.getObjectName(rmx);
        const nChildren = rmx.nChildren ?? 0;
        const childIds = this.getChildIds(rmx);
        // If nChildren > 0 but no children enumerated, they haven't been loaded yet
        const children = (nChildren > 0 && childIds.length === 0) ? null : childIds;
        const parentId = rmx.twParentIx && rmx.wClass_Parent && ClassIdToPrefix[rmx.wClass_Parent]
            ? formatObjectRef(rmx.wClass_Parent, rmx.twParentIx)
            : null;
        return {
            id,
            parentId,
            name,
            transform: {
                position: {
                    x: rmx.pTransform?.vPosition?.dX ?? 0,
                    y: rmx.pTransform?.vPosition?.dY ?? 0,
                    z: rmx.pTransform?.vPosition?.dZ ?? 0,
                },
                rotation: {
                    x: rmx.pTransform?.qRotation?.dX ?? 0,
                    y: rmx.pTransform?.qRotation?.dY ?? 0,
                    z: rmx.pTransform?.qRotation?.dZ ?? 0,
                    w: rmx.pTransform?.qRotation?.dW ?? 1,
                },
                scale: {
                    x: rmx.pTransform?.vScale?.dX ?? 1,
                    y: rmx.pTransform?.vScale?.dY ?? 1,
                    z: rmx.pTransform?.vScale?.dZ ?? 1,
                },
            },
            resourceReference: rmx.pResource?.sReference || null,
            resourceName: rmx.pResource?.sName || null,
            bound: rmx.pBound ? {
                x: rmx.pBound.dX ?? 0,
                y: rmx.pBound.dY ?? 0,
                z: rmx.pBound.dZ ?? 0,
            } : null,
            classId: rmx.wClass_Object,
            type: rmx.pType?.bType ?? 0,
            subtype: rmx.pType?.bSubtype ?? 0,
            isAttachmentPoint: (rmx.pType?.bSubtype ?? 0) === 255,
            children,
            orbit: rmx.wClass_Object === 71 && rmx.pOrbit_Spin ? {
                period: rmx.pOrbit_Spin.tmPeriod ?? 0,
                start: rmx.pOrbit_Spin.tmStart ?? 0,
                a: rmx.pOrbit_Spin.dA ?? 0,
                b: rmx.pOrbit_Spin.dB ?? 0,
            } : undefined,
            properties: rmx.wClass_Object === 71 && rmx.pProperties ? {
                mass: rmx.pProperties.fMass ?? 0,
                gravity: rmx.pProperties.fGravity ?? 0,
                color: rmx.pProperties.fColor ?? 0,
                brightness: rmx.pProperties.fBrightness ?? 0,
                reflectivity: rmx.pProperties.fReflectivity ?? 0,
            } : undefined,
        };
    }
    /**
     * @returns {string}
     */
    getResourceRootUrl() {
        return this.pFabric?.pMSFConfig?.map?.sRootUrl || '';
    }
}
/**
 * @param {FabricScopeId} scopeId
 * @returns {Error}
 */
function createScopeClosingError(scopeId) {
    const err = new Error(`Scope is closing: ${scopeId}`);
    err.code = 'SCOPE_CLOSING';
    err.scopeId = scopeId;
    return err;
}
/**
 * @param {BulkOperation[]} operations
 * @returns {string[]}
 */
function getBulkOperationInvalidationIds(operations) {
    if (!Array.isArray(operations)) {
        return [];
    }
    const ids = [];
    for (const operation of operations) {
        const params = operation?.params ?? {};
        if (operation?.type === 'create') {
            ids.push(params.parentId);
            continue;
        }
        if (operation?.type === 'update' || operation?.type === 'delete') {
            ids.push(params.objectId);
            continue;
        }
        if (operation?.type === 'move') {
            ids.push(params.objectId, params.newParentId);
        }
    }
    return ids.filter((value) => typeof value === 'string' && value.length > 0);
}
export class ManifolderClient {
    /** @type {number|undefined} */
    promiseTimeoutMs;
    /** @type {Map<FabricScopeId, ScopeInfo>} */
    scopeRegistry = new Map();
    scopeRuntimes = new Map();
    rootConnectInFlight = new Map();
    closingScopes = new Set();
    callbacks = {
        connected: [],
        disconnected: [],
        error: [],
        status: [],
        mapData: [],
        nodeInserted: [],
        nodeUpdated: [],
        nodeDeleted: [],
        modelReady: [],
    };
    /**
     * @param {ClientEvent} event
     * @param {ClientEventHandler} handler
     * @returns {void}
     */
    on(event, handler) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(handler);
        }
    }
    /**
     * @param {ClientEvent} event
     * @param {ClientEventHandler} handler
     * @returns {void}
     */
    off(event, handler) {
        if (!this.callbacks[event]) {
            return;
        }
        const index = this.callbacks[event].indexOf(handler);
        if (index !== -1) {
            this.callbacks[event].splice(index, 1);
        }
    }
    _emit(event, data) {
        this.callbacks[event]?.forEach((handler) => {
            try {
                handler(data);
            }
            catch {
                // handler errors should not propagate
            }
        });
    }
    get connected() {
        for (const runtime of this.scopeRuntimes.values()) {
            if (runtime.connected) {
                return true;
            }
        }
        return false;
    }
    /**
     * @param {ScopeInfo} scopeInfo
     * @returns {ScopeInfo}
     */
    _registerScope(scopeInfo) {
        this.scopeRegistry.set(scopeInfo.scopeId, { ...scopeInfo });
        return this.scopeRegistry.get(scopeInfo.scopeId);
    }
    /**
     * @param {FabricScopeId} scopeId
     * @returns {boolean}
     */
    _unregisterScope(scopeId) {
        return this.scopeRegistry.delete(scopeId);
    }
    /**
     * @param {FabricScopeId} scopeId
     * @returns {ScopeInfo | null}
     */
    _getScope(scopeId) {
        return this.scopeRegistry.get(scopeId) ?? null;
    }
    /**
     * @returns {ScopeInfo[]}
     */
    listScopes() {
        return Array.from(this.scopeRegistry.values()).map((scope) => ({ ...scope }));
    }
    /**
     * @param {FabricScopeId} candidateChildScopeId
     * @param {FabricScopeId} currentScopeId
     * @returns {{ isCycle: true; existingScopeId: FabricScopeId } | { isCycle: false }}
     */
    _detectCycle(candidateChildScopeId, currentScopeId) {
        let cursorScopeId = currentScopeId;
        while (cursorScopeId) {
            if (cursorScopeId === candidateChildScopeId) {
                return { isCycle: true, existingScopeId: cursorScopeId };
            }
            cursorScopeId = this.scopeRegistry.get(cursorScopeId)?.parentScopeId ?? null;
        }
        return { isCycle: false };
    }
    /**
     * @param {FabricScopeId} scopeId
     * @returns {SingleScopeClient}
     */
    _requireScopeRuntime(scopeId) {
        if (this.closingScopes.has(scopeId)) {
            throw createScopeClosingError(scopeId);
        }
        const runtime = this.scopeRuntimes.get(scopeId);
        if (!runtime) {
            throw new Error(`Scope not found: ${scopeId}`);
        }
        return runtime;
    }
    /**
     * @returns {SingleScopeClient}
     */
    _createScopeRuntime() {
        const runtime = new SingleScopeClient();
        if (this.promiseTimeoutMs != null) {
            runtime.promiseTimeoutMs = this.promiseTimeoutMs;
        }
        return runtime;
    }
    /**
     * @param {FabricScopeId} scopeId
     * @param {SingleScopeClient} runtime
     * @returns {void}
     */
    _wireScopeRuntime(scopeId, runtime) {
        const getScopeInfo = () => this.scopeRegistry.get(scopeId);

        const modelNodeUid = (model) =>
            model?.wClass_Object && model?.twObjectIx
                ? computeNodeUid(scopeId, model.wClass_Object, model.twObjectIx)
                : null;

        const classNodeUid = (className, id) => {
            const classId = this._classNameToId(className);
            return classId && id != null ? computeNodeUid(scopeId, classId, id) : null;
        };

        runtime.on('connected', () => {
            const scopeInfo = getScopeInfo();
            this._emit('connected', {
                scopeId,
                parentScopeId: scopeInfo?.parentScopeId ?? null,
                depth: scopeInfo?.depth ?? 0,
            });
        });
        runtime.on('disconnected', () => {
            const scopeInfo = getScopeInfo();
            this._emit('disconnected', {
                scopeId,
                parentScopeId: scopeInfo?.parentScopeId ?? null,
                depth: scopeInfo?.depth ?? 0,
            });
        });
        runtime.on('error', (error) => {
            if (error && typeof error === 'object' && !Object.prototype.hasOwnProperty.call(error, 'scopeId')) {
                try {
                    error.scopeId = scopeId;
                }
                catch {
                    // Best effort scope attribution.
                }
            }
            this._emit('error', error);
        });
        runtime.on('status', (status) => {
            const scopeInfo = getScopeInfo();
            if (scopeInfo?.parentScopeId === null) {
                this._emit('status', status);
            }
        });
        runtime.on('mapData', ({ mvmfModel }) => {
            this._emit('mapData', { scopeId, nodeUid: modelNodeUid(mvmfModel), mvmfModel });
        });
        runtime.on('modelReady', ({ mvmfModel }) => {
            this._emit('modelReady', { scopeId, nodeUid: modelNodeUid(mvmfModel), mvmfModel });
        });
        runtime.on('nodeInserted', ({ mvmfModel, parentType, parentId }) => {
            this._emit('nodeInserted', {
                scopeId,
                nodeUid: modelNodeUid(mvmfModel),
                parentNodeUid: classNodeUid(parentType, parentId),
                mvmfModel,
                parentType,
                parentId,
            });
        });
        runtime.on('nodeUpdated', ({ id, type, mvmfModel }) => {
            const classId = mvmfModel?.wClass_Object ?? this._classNameToId(type);
            this._emit('nodeUpdated', {
                scopeId,
                nodeUid: classId && id != null ? computeNodeUid(scopeId, classId, id) : null,
                id,
                type,
                mvmfModel,
            });
        });
        runtime.on('nodeDeleted', ({ id, type, sourceParentType, sourceParentId }) => {
            this._emit('nodeDeleted', {
                scopeId,
                nodeUid: classNodeUid(type, id),
                parentNodeUid: classNodeUid(sourceParentType, sourceParentId),
                id,
                type,
                sourceParentType,
                sourceParentId,
            });
        });
    }
    /**
     * @template {keyof SingleScopeClient} TMethodName
     * @param {SingleScopeClient} runtime
     * @param {TMethodName} methodName
     * @param {...any} args
     * @returns {any}
     */
    /**
     * @param {string | null | undefined} className
     * @returns {number | null}
     */
    _classNameToId(className) {
        return ClassIds[className] ?? null;
    }
    /**
     * @param {FabricScopeId} scopeId
     * @param {FabricObject} obj
     * @returns {FabricObject}
     */
    _enrichObjectWithScope(scopeId, obj) {
        const { classId, numericId } = parseObjectRef(obj.id);
        const nodeUid = computeNodeUid(scopeId, classId, numericId);
        let parentNodeUid = null;
        if (obj.parentId) {
            const parsedParent = parseObjectRef(obj.parentId);
            parentNodeUid = computeNodeUid(scopeId, parsedParent.classId, parsedParent.numericId);
        }
        return {
            ...obj,
            scopeId,
            nodeUid,
            parentNodeUid,
        };
    }
    /**
     * @param {FabricScopeId} scopeId
     * @returns {string | null}
     */
    _getScopeFabricKey(scopeId) {
        const scopeInfo = this.scopeRegistry.get(scopeId);
        if (!scopeInfo?.fabricUrl) {
            return null;
        }
        try {
            return normalizeUrl(scopeInfo.fabricUrl);
        }
        catch {
            return scopeInfo.fabricUrl;
        }
    }
    /**
     * Invalidate object cache entries across all open scopes connected to the same fabric URL.
     * @param {FabricScopeId} scopeId
     * @param {string} objectId
     * @returns {void}
     */
    _invalidateObjectCachesAcrossFabric(scopeId, objectId) {
        if (!objectId) {
            return;
        }
        const sourceFabricKey = this._getScopeFabricKey(scopeId);
        if (!sourceFabricKey) {
            return;
        }
        for (const [candidateScopeId] of this.scopeRegistry.entries()) {
            const runtime = this.scopeRuntimes.get(candidateScopeId);
            if (!runtime?.objectCache) {
                continue;
            }
            const candidateFabricKey = this._getScopeFabricKey(candidateScopeId);
            if (candidateFabricKey !== sourceFabricKey) {
                continue;
            }
            const cachedModel = runtime.objectCache.get(objectId);
            if (cachedModel?.sID && Number.isInteger(cachedModel.twObjectIx)) {
                try {
                    runtime.closeModel({ sID: cachedModel.sID, twObjectIx: cachedModel.twObjectIx });
                }
                catch {
                    // best effort close
                }
            }
            runtime.objectCache.delete(objectId);
        }
    }
    /**
     * @param {FabricScopeId} scopeId
     * @param {Array<string | null | undefined>} objectIds
     * @returns {void}
     */
    _invalidateObjectIdsAcrossFabric(scopeId, objectIds) {
        if (!Array.isArray(objectIds) || objectIds.length === 0) {
            return;
        }
        const uniqueIds = new Set(objectIds.filter((value) => typeof value === 'string' && value.length > 0));
        for (const objectId of uniqueIds) {
            this._invalidateObjectCachesAcrossFabric(scopeId, objectId);
        }
    }
    async connectRoot({ fabricUrl, adminKey = '', timeoutMs = 60000 }) {
        const scopeId = await computeRootScopeId(fabricUrl);
        if (this.closingScopes.has(scopeId)) {
            throw createScopeClosingError(scopeId);
        }
        const existingConnect = this.rootConnectInFlight.get(scopeId);
        if (existingConnect) {
            return existingConnect;
        }
        const connectPromise = (async () => {
            const existingScope = this.scopeRegistry.get(scopeId);
            if (existingScope) {
                const runtime = this._requireScopeRuntime(scopeId);
                if (!runtime.connected) {
                    await runtime.connect(existingScope.fabricUrl, { adminKey, timeoutMs }, timeoutMs);
                }
                const rootModel = runtime.pRMRoot;
                const rootClassId = rootModel?.wClass_Object ?? ClassIds.RMRoot;
                const rootObjectIx = rootModel?.twObjectIx ?? 1;
                return {
                    scopeId,
                    rootObjectId: rootModel ? runtime.getPrefixedId(rootModel) : 'root',
                    rootNodeUid: computeNodeUid(scopeId, rootClassId, rootObjectIx),
                    rootModel,
                };
            }
            const runtime = this._createScopeRuntime();
            await runtime.connect(fabricUrl, { adminKey, timeoutMs }, timeoutMs);
            this._wireScopeRuntime(scopeId, runtime);
            this.scopeRuntimes.set(scopeId, runtime);
            const registered = this._registerScope({
                scopeId,
                fabricUrl,
                parentScopeId: null,
                attachmentNodeUid: null,
                depth: 0,
            });
            const rootModel = runtime.pRMRoot;
            const rootClassId = rootModel?.wClass_Object ?? ClassIds.RMRoot;
            const rootObjectIx = rootModel?.twObjectIx ?? 1;
            return {
                scopeId: registered.scopeId,
                rootObjectId: rootModel ? runtime.getPrefixedId(rootModel) : 'root',
                rootNodeUid: computeNodeUid(scopeId, rootClassId, rootObjectIx),
                rootModel,
            };
        })();
        this.rootConnectInFlight.set(scopeId, connectPromise);
        try {
            return await connectPromise;
        }
        finally {
            if (this.rootConnectInFlight.get(scopeId) === connectPromise) {
                this.rootConnectInFlight.delete(scopeId);
            }
        }
    }
    async closeScope({ scopeId, cascade = false }) {
        if (!this.scopeRegistry.has(scopeId)) {
            throw new Error(`Scope not found: ${scopeId}`);
        }
        const toClose = new Set([scopeId]);
        if (cascade) {
            let changed = true;
            while (changed) {
                changed = false;
                for (const scope of this.scopeRegistry.values()) {
                    if (!scope.parentScopeId || toClose.has(scope.scopeId)) {
                        continue;
                    }
                    if (toClose.has(scope.parentScopeId)) {
                        toClose.add(scope.scopeId);
                        changed = true;
                    }
                }
            }
        }
        const ordered = Array.from(toClose).sort((a, b) => {
            const depthA = this.scopeRegistry.get(a)?.depth ?? 0;
            const depthB = this.scopeRegistry.get(b)?.depth ?? 0;
            return depthB - depthA;
        });
        for (const closingScopeId of ordered) {
            this.closingScopes.add(closingScopeId);
        }
        try {
            for (const closingScopeId of ordered) {
                this.rootConnectInFlight.delete(closingScopeId);
                const runtime = this.scopeRuntimes.get(closingScopeId);
                if (runtime) {
                    await Promise.resolve(runtime.disconnect()).catch(() => { });
                    this.scopeRuntimes.delete(closingScopeId);
                }
                this._unregisterScope(closingScopeId);
            }
        }
        finally {
            for (const closingScopeId of ordered) {
                this.closingScopes.delete(closingScopeId);
            }
        }
        return { closedScopeIds: ordered };
    }
    getScopeStatus({ scopeId }) {
        const status = this._requireScopeRuntime(scopeId).getStatus();
        return {
            ...status,
            scopeId,
        };
    }
    getResourceRootUrl({ scopeId }) {
        return this._requireScopeRuntime(scopeId).getResourceRootUrl();
    }
    openModel({ scopeId, sID, twObjectIx }) {
        return this._requireScopeRuntime(scopeId).openModel({ sID, twObjectIx });
    }
    closeModel({ scopeId, sID, twObjectIx }) {
        return this._requireScopeRuntime(scopeId).closeModel({ sID, twObjectIx });
    }
    enumerateChildren({ scopeId, model }) {
        return this._requireScopeRuntime(scopeId).enumerateChildren(model);
    }
    async searchNodes({ scopeId, searchText }) {
        return this._requireScopeRuntime(scopeId).searchNodes(searchText);
    }
    async listScenes({ scopeId }) {
        const scenes = await this._requireScopeRuntime(scopeId).listScenes();
        return scenes.map((scene) => ({ ...scene, scopeId }));
    }
    async openScene({ scopeId, sceneId }) {
        const obj = await this._requireScopeRuntime(scopeId).openScene(sceneId);
        return this._enrichObjectWithScope(scopeId, obj);
    }
    async createScene({ scopeId, name, objectType }) {
        const scene = await this._requireScopeRuntime(scopeId).createScene(name, objectType);
        return { ...scene, scopeId };
    }
    async deleteScene({ scopeId, sceneId }) {
        return this._requireScopeRuntime(scopeId).deleteScene(sceneId);
    }
    async listObjects({ scopeId, anchorObjectId, filter }) {
        const objects = await this._requireScopeRuntime(scopeId).listObjects(anchorObjectId, filter);
        return objects.map((obj) => this._enrichObjectWithScope(scopeId, obj));
    }
    async getObject({ scopeId, objectId }) {
        const obj = await this._requireScopeRuntime(scopeId).getObject(objectId);
        return this._enrichObjectWithScope(scopeId, obj);
    }
    async createObject({ scopeId, ...createParams }) {
        const obj = await this._requireScopeRuntime(scopeId).createObject(createParams);
        this._invalidateObjectIdsAcrossFabric(scopeId, [createParams.parentId, obj?.id ?? null]);
        return this._enrichObjectWithScope(scopeId, obj);
    }
    async updateObject({ scopeId, ...updateParams }) {
        const obj = await this._requireScopeRuntime(scopeId).updateObject(updateParams);
        this._invalidateObjectIdsAcrossFabric(scopeId, [updateParams.objectId, obj?.parentId ?? null]);
        return this._enrichObjectWithScope(scopeId, obj);
    }
    async deleteObject({ scopeId, objectId }) {
        const runtime = this._requireScopeRuntime(scopeId);
        const cached = runtime.objectCache?.get(objectId);
        const parentId = cached?.wClass_Parent && Number.isInteger(cached?.twParentIx)
            ? formatObjectRef(cached.wClass_Parent, cached.twParentIx)
            : null;
        await runtime.deleteObject(objectId);
        this._invalidateObjectIdsAcrossFabric(scopeId, [objectId, parentId]);
    }
    async moveObject({ scopeId, objectId, newParentId, skipRefetch }) {
        const runtime = this._requireScopeRuntime(scopeId);
        const cached = runtime.objectCache?.get(objectId);
        const oldParentId = cached?.wClass_Parent && Number.isInteger(cached?.twParentIx)
            ? formatObjectRef(cached.wClass_Parent, cached.twParentIx)
            : null;
        const obj = await runtime.moveObject(objectId, newParentId, skipRefetch);
        this._invalidateObjectIdsAcrossFabric(scopeId, [objectId, newParentId, oldParentId, obj?.parentId ?? null]);
        return this._enrichObjectWithScope(scopeId, obj);
    }
    async bulkUpdate({ scopeId, operations, options }) {
        const result = await this._requireScopeRuntime(scopeId).bulkUpdate(operations, options);
        const createdIds = Array.isArray(result?.createdIds) ? result.createdIds : [];
        this._invalidateObjectIdsAcrossFabric(scopeId, [...getBulkOperationInvalidationIds(operations), ...createdIds]);
        return result;
    }
    async findObjects({ scopeId, anchorObjectId, query }) {
        const objects = await this._requireScopeRuntime(scopeId).findObjects(anchorObjectId, query);
        return objects.map((obj) => this._enrichObjectWithScope(scopeId, obj));
    }
    async findEarthAttachmentParent({ scopeId, anchorObjectId, ...params }) {
        return this._requireScopeRuntime(scopeId).findEarthAttachmentParent(anchorObjectId, params);
    }
    async followAttachment({ scopeId, objectId, autoOpenRoot = true }) {
        const parentRuntime = this._requireScopeRuntime(scopeId);
        let attachmentObject;
        try {
            attachmentObject = await parentRuntime.getObject(objectId);
        }
        catch (error) {
            const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
            const invalidRef = message.includes('invalid object reference')
                || message.includes('unknown class prefix')
                || message.includes('invalid numeric id');
            const missingObject = message.includes('not found')
                || message.includes('failed to open')
                || message.includes('cannot find');
            if (!invalidRef && missingObject) {
                const err = new Error(`Attachment object not found: ${objectId}`);
                err.code = 'ATTACHMENT_NOT_FOUND';
                err.scopeId = scopeId;
                err.details = { objectId };
                throw err;
            }
            throw error;
        }
        if (!attachmentObject.isAttachmentPoint) {
            const err = new Error(`Object ${objectId} is not an attachment point (bSubtype !== 255)`);
            err.code = 'ATTACHMENT_REFERENCE_INVALID';
            err.scopeId = scopeId;
            throw err;
        }
        const msfReference = await getMsfReference({
            resourceRef: attachmentObject.resourceReference,
            properties: {
                pResource: {
                    sReference: attachmentObject.resourceReference,
                },
            },
        });
        if (!msfReference) {
            const err = new Error(`Attachment point ${objectId} has no resolvable MSF reference`);
            err.code = 'UNRESOLVABLE_ATTACHMENT_POINT';
            err.scopeId = scopeId;
            throw err;
        }
        const parsedAttachment = parseObjectRef(attachmentObject.id);
        const attachmentNodeUid = computeNodeUid(scopeId, parsedAttachment.classId, parsedAttachment.numericId);
        const childScopeId = await computeChildScopeId(attachmentNodeUid, msfReference);
        const cycleCheck = this._detectCycle(childScopeId, scopeId);
        if (cycleCheck.isCycle) {
            const existingScopeInfo = this.scopeRegistry.get(cycleCheck.existingScopeId);
            const existingRuntime = this.scopeRuntimes.get(cycleCheck.existingScopeId);
            const existingRoot = existingRuntime?.pRMRoot;
            const existingNodeUid = existingRoot
                ? computeNodeUid(cycleCheck.existingScopeId, existingRoot.wClass_Object ?? ClassIds.RMRoot, existingRoot.twObjectIx ?? 1)
                : (existingScopeInfo?.attachmentNodeUid || cycleCheck.existingScopeId);
            const existingLabel = existingRoot
                ? (existingRuntime.getObjectName(existingRoot) || existingScopeInfo?.fabricUrl || cycleCheck.existingScopeId)
                : (existingScopeInfo?.fabricUrl || cycleCheck.existingScopeId);
            const err = new Error(`Attachment cycle detected for scope ${childScopeId}`);
            err.code = 'ATTACHMENT_CYCLE_DETECTED';
            err.scopeId = scopeId;
            err.nodeUid = attachmentNodeUid;
            err.details = {
                existingNodeUid,
                existingLabel,
            };
            throw err;
        }
        let childRuntime = this.scopeRuntimes.get(childScopeId);
        let reused = true;
        if (!childRuntime) {
            reused = false;
            childRuntime = this._createScopeRuntime();
            await childRuntime.connect(msfReference, { adminKey: '' }, 60000);
            this._wireScopeRuntime(childScopeId, childRuntime);
            this.scopeRuntimes.set(childScopeId, childRuntime);
            const parentScopeInfo = this.scopeRegistry.get(scopeId);
            this._registerScope({
                scopeId: childScopeId,
                fabricUrl: msfReference,
                parentScopeId: scopeId,
                attachmentNodeUid,
                depth: (parentScopeInfo?.depth ?? 0) + 1,
            });
        }
        const result = {
            parentScopeId: scopeId,
            attachmentNodeUid,
            childScopeId,
            childFabricUrl: msfReference,
            reused,
        };
        if (autoOpenRoot) {
            const root = childRuntime.pRMRoot;
            if (root) {
                result.root = {
                    id: childRuntime.getPrefixedId(root),
                    name: childRuntime.getObjectName(root),
                    childCount: root.nChildren ?? 0,
                };
            }
        }
        return result;
    }
}
const COMMON_CLIENT_METHODS = /** @type {const} */ ([
    'connectRoot',
    'closeScope',
    'getScopeStatus',
    'listScopes',
    'followAttachment',
    'getResourceRootUrl',
]);
const SUBSCRIPTION_ONLY_METHODS = /** @type {const} */ ([
    'on',
    'off',
    'openModel',
    'closeModel',
    'enumerateChildren',
    'searchNodes',
]);
const PROMISE_ONLY_METHODS = /** @type {const} */ ([
    'listScenes',
    'openScene',
    'createScene',
    'deleteScene',
    'listObjects',
    'getObject',
    'createObject',
    'updateObject',
    'deleteObject',
    'moveObject',
    'bulkUpdate',
    'findObjects',
    'findEarthAttachmentParent',
]);
const SUBSCRIPTION_CLIENT_METHODS = /** @type {const} */ ([
    ...COMMON_CLIENT_METHODS,
    ...SUBSCRIPTION_ONLY_METHODS,
]);
const PROMISE_CLIENT_METHODS = /** @type {const} */ ([
    ...COMMON_CLIENT_METHODS,
    ...PROMISE_ONLY_METHODS,
]);
/**
 * @typedef {{ connected: ManifolderClient['connected'] } & Pick<ManifolderClient, (typeof COMMON_CLIENT_METHODS)[number]>} IManifolderClientCommon
 * @typedef {IManifolderClientCommon & Pick<ManifolderClient, (typeof SUBSCRIPTION_ONLY_METHODS)[number]>} IManifolderSubscriptionClient
 * @typedef {IManifolderClientCommon & Pick<ManifolderClient, (typeof PROMISE_ONLY_METHODS)[number]>} IManifolderPromiseClient
 */
/**
 * @template {readonly (keyof ManifolderClient)[]} TMethodNames
 * @param {ManifolderClient} client
 * @param {TMethodNames} methodNames
 * @returns {{ readonly connected: ManifolderClient['connected'] } & Readonly<Pick<ManifolderClient, TMethodNames[number]>>}
 */
function createClientView(client, methodNames) {
    const view = {};
    Object.defineProperty(view, 'connected', {
        enumerable: true,
        get: () => client.connected,
    });
    Object.defineProperty(view, 'promiseTimeoutMs', {
        enumerable: true,
        get: () => client.promiseTimeoutMs,
        set: (value) => {
            client.promiseTimeoutMs = value;
            for (const runtime of client.scopeRuntimes.values()) {
                runtime.promiseTimeoutMs = value;
            }
        },
    });
    for (const methodName of methodNames) {
        view[methodName] = client[methodName].bind(client);
    }
    return Object.freeze(view);
}
/**
 * @param {ManifolderClient} client
 * @returns {IManifolderSubscriptionClient}
 */
export function asManifolderSubscriptionClient(client) {
    return createClientView(client, SUBSCRIPTION_CLIENT_METHODS);
}
/**
 * @param {ManifolderClient} client
 * @returns {IManifolderPromiseClient}
 */
export function asManifolderPromiseClient(client) {
    return createClientView(client, PROMISE_CLIENT_METHODS);
}
/**
 * @returns {IManifolderSubscriptionClient}
 */
export function createManifolderSubscriptionClient() {
    return asManifolderSubscriptionClient(new ManifolderClient());
}
/**
 * @returns {IManifolderPromiseClient}
 */
export function createManifolderPromiseClient(options = {}) {
    const client = new ManifolderClient();
    if (typeof options.promiseTimeoutMs === 'number') {
        client.promiseTimeoutMs = options.promiseTimeoutMs;
    }
    return asManifolderPromiseClient(client);
}
