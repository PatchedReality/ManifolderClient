export declare const ClassIds: {
    readonly RMRoot: 70;
    readonly RMCObject: 71;
    readonly RMTObject: 72;
    readonly RMPObject: 73;
};
export declare const ClassPrefixes: Record<string, number>;
export declare const ClassIdToPrefix: Record<number, string>;
export declare function parseObjectRef(ref: string): {
    classId: number;
    numericId: number;
};
export declare function formatObjectRef(classId: number, numericId: number): string;
export declare const ObjectTypeMap: Record<string, {
    classId: number;
    subtype: number;
}>;
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
export interface Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
}
export interface Transform {
    position: Vector3;
    rotation: Quaternion;
    scale: Vector3;
}
export interface Orbit {
    period: number;
    start: number;
    a: number;
    b: number;
}
export interface CelestialProperties {
    mass: number;
    gravity: number;
    color: number;
    brightness: number;
    reflectivity: number;
}
export type FabricScopeId = string;
export type NodeUid = string;
export interface ScopeInfo {
    scopeId: FabricScopeId;
    fabricUrl: string;
    parentScopeId: FabricScopeId | null;
    attachmentNodeUid: NodeUid | null;
    depth: number;
}
export interface ScopeStatus {
    scopeId: FabricScopeId;
    connected: boolean;
    fabricUrl: string | null;
    currentSceneId: string | null;
    currentSceneName: string | null;
    resourceRootUrl: string | null;
}
export interface ConnectRootParams {
    fabricUrl: string;
    adminKey?: string;
    timeoutMs?: number;
}
export interface FollowAttachmentParams {
    scopeId: FabricScopeId;
    objectId: string;
    autoOpenRoot?: boolean;
}
export interface FollowAttachmentResult {
    parentScopeId: FabricScopeId;
    attachmentNodeUid: NodeUid;
    childScopeId: FabricScopeId;
    childFabricUrl: string;
    reused: boolean;
    root?: {
        id: string;
        name: string;
        childCount: number;
    };
}
export interface FabricObject {
    id: string;
    parentId: string | null;
    scopeId?: FabricScopeId;
    nodeUid?: NodeUid;
    parentNodeUid?: NodeUid | null;
    name: string;
    transform: Transform;
    resourceReference: string | null;
    resourceName: string | null;
    bound: Vector3 | null;
    classId: number;
    subtype: number;
    children: string[] | null;
    orbit?: Orbit | null;
    properties?: CelestialProperties | null;
}
export interface Scene {
    id: string;
    name: string;
    rootObjectId: string;
    classId: number;
    scopeId?: FabricScopeId;
    url?: string;
}
export interface ObjectFilter {
    namePattern?: string;
    type?: string;
}
export interface SearchQuery {
    namePattern?: string;
    positionRadius?: {
        center: Vector3;
        radius: number;
    };
    resourceUrl?: string;
}
export interface CreateObjectParams {
    parentId: string;
    name: string;
    position?: Vector3;
    rotation?: Quaternion;
    scale?: Vector3;
    resourceReference?: string;
    resourceName?: string;
    bound?: Vector3;
    objectType?: string;
    orbit?: Orbit;
    properties?: CelestialProperties;
    skipParentRefetch?: boolean;
}
export interface UpdateObjectParams {
    objectId: string;
    name?: string;
    position?: Vector3;
    rotation?: Quaternion;
    scale?: Vector3;
    resourceReference?: string;
    resourceName?: string;
    bound?: Vector3;
    orbit?: Orbit;
    properties?: CelestialProperties;
    skipRefetch?: boolean;
}
export interface BulkOperation {
    type: 'create' | 'update' | 'delete' | 'move';
    params: CreateObjectParams | UpdateObjectParams | {
        objectId: string;
    } | {
        objectId: string;
        newParentId: string;
    };
}
export interface ConnectionStatus {
    connected: boolean;
    scopeId?: FabricScopeId;
    fabricUrl: string | null;
    currentSceneId: string | null;
    currentSceneName: string | null;
    resourceRootUrl: string | null;
}
