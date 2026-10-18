import type { CampusBuildingId } from './campus'

export type Point3 = readonly [number, number, number]

export type RouteVerificationStatus = 'verified' | 'provisional'

export type NavigationNodeKind = 'start' | 'destination' | 'waypoint' | 'entrance' | 'marker'

export interface NavigationNode {
  id: string
  label: string
  position: Point3
  kind: NavigationNodeKind
  buildingId?: CampusBuildingId
  sourceObjectName: string
  verificationStatus: RouteVerificationStatus
  notes?: string
}

export interface NavigationEdge {
  id: string
  from: string
  to: string
  sourceObjectName: string
  verificationStatus: RouteVerificationStatus
  notes?: string
  cost?: number
}

export interface NavigationGraph {
  nodes: NavigationNode[]
  edges: NavigationEdge[]
}

export interface RouteStep {
  nodeId: string
  title: string
  notes?: string
  verificationStatus: RouteVerificationStatus
}

export interface RoutePlan {
  nodeIds: string[]
  steps: RouteStep[]
  verificationStatus: RouteVerificationStatus
  hasVerifiedPath: boolean
  notes: string[]
  totalCost: number
}

export type RoutePlanResult =
  | { status: 'ok'; route: RoutePlan }
  | { status: 'invalid-node'; message: string }
  | { status: 'no-route'; message: string }
