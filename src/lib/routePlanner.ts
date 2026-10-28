import type { NavigationEdge, NavigationGraph, NavigationNode, Point3, RoutePlanResult, RouteStep, RouteVerificationStatus } from '../types/navigation'

function distanceBetween([ax, ay, az]: Point3, [bx, by, bz]: Point3) {
  return Math.hypot(ax - bx, ay - by, az - bz)
}

function mergeStatus(left: RouteVerificationStatus, right: RouteVerificationStatus): RouteVerificationStatus {
  return left === 'verified' && right === 'verified' ? 'verified' : 'provisional'
}

function buildNodeIndex(nodes: NavigationNode[]) {
  return new Map(nodes.map((node) => [node.id, node]))
}

function buildAdjacency(edges: NavigationEdge[]) {
  const adjacency = new Map<string, NavigationEdge[]>()
  for (const edge of edges) {
    const forward = adjacency.get(edge.from) ?? []
    forward.push(edge)
    adjacency.set(edge.from, forward)

    const reverse = adjacency.get(edge.to) ?? []
    reverse.push({ ...edge, id: `${edge.id}__reverse`, from: edge.to, to: edge.from })
    adjacency.set(edge.to, reverse)
  }
  return adjacency
}

export function createRoutePlan(graph: NavigationGraph, startId: string, destinationId: string): RoutePlanResult {
  const nodes = buildNodeIndex(graph.nodes)
  if (!nodes.has(startId)) {
    return { status: 'invalid-node', message: `Unknown starting node: ${startId}` }
  }
  if (!nodes.has(destinationId)) {
    return { status: 'invalid-node', message: `Unknown destination node: ${destinationId}` }
  }

  const route = findShortestPath(graph, startId, destinationId)
  if (!route) {
    return { status: 'no-route', message: 'No route could be confirmed with the current campus graph.' }
  }

function computeTurnTitle(
  node: NavigationNode,
  index: number,
  totalNodes: number,
  prevNode?: NavigationNode,
  nextNode?: NavigationNode,
): string {
  if (index === 0) {
    return `Start at ${node.label}`
  }
  if (index === totalNodes - 1) {
    return `Arrive at ${node.label}`
  }
  if (prevNode && nextNode) {
    // Vector in (from previous node to current node)
    const v1x = node.position[0] - prevNode.position[0]
    const v1z = node.position[2] - prevNode.position[2]
    // Vector out (from current node to next node)
    const v2x = nextNode.position[0] - node.position[0]
    const v2z = nextNode.position[2] - node.position[2]

    const cross = v1x * v2z - v1z * v2x
    const dot = v1x * v2x + v1z * v2z
    const angleDeg = Math.atan2(cross, dot) * (180 / Math.PI)

    // Positive angle in right-handed Three.js (+X East, +Z South) corresponds to turning right
    if (angleDeg >= 25 && angleDeg <= 155) {
      return `Turn right towards ${node.label}`
    }
    if (angleDeg <= -25 && angleDeg >= -155) {
      return `Turn left towards ${node.label}`
    }
  }
  return `Continue to ${node.label}`
}

  const steps = route.nodeIds.map((nodeId, index) => {
    const node = nodes.get(nodeId)
    if (!node) {
      throw new Error(`Route reconstruction failed for node ${nodeId}`)
    }
    const prevNode = index > 0 ? nodes.get(route.nodeIds[index - 1]) : undefined
    const nextNode = index < route.nodeIds.length - 1 ? nodes.get(route.nodeIds[index + 1]) : undefined
    const title = computeTurnTitle(node, index, route.nodeIds.length, prevNode, nextNode)
    return {
      nodeId,
      title,
      notes: node.notes,
      verificationStatus: node.verificationStatus,
    } satisfies RouteStep
  })

  const routeVerification = route.edgeStatuses.reduce<RouteVerificationStatus>(
    (acc, status) => mergeStatus(acc, status),
    'verified',
  )
  const notes = new Set<string>()
  route.edgeNotes.forEach((note) => {
    if (note) notes.add(note)
  })
  route.nodeNotes.forEach((note) => {
    if (note) notes.add(note)
  })

  return {
    status: 'ok',
    route: {
      nodeIds: route.nodeIds,
      steps,
      verificationStatus: routeVerification,
      hasVerifiedPath: routeVerification === 'verified',
      notes: [...notes],
      totalCost: route.cost,
    },
  }
}

interface InternalRouteResult {
  nodeIds: string[]
  edgeStatuses: RouteVerificationStatus[]
  edgeNotes: Array<string | undefined>
  nodeNotes: Array<string | undefined>
  cost: number
}

export function findShortestPath(graph: NavigationGraph, startId: string, destinationId: string): InternalRouteResult | null {
  const nodes = buildNodeIndex(graph.nodes)
  const adjacency = buildAdjacency(graph.edges)

  if (startId === destinationId) {
    const node = nodes.get(startId)
    return {
      nodeIds: [startId],
      edgeStatuses: [],
      edgeNotes: [],
      nodeNotes: [node?.notes],
      cost: 0,
    }
  }

  const distances = new Map<string, number>()
  const previous = new Map<string, { nodeId: string; edge: NavigationEdge }>()
  const queue: Array<{ nodeId: string; cost: number }> = [{ nodeId: startId, cost: 0 }]
  distances.set(startId, 0)

  while (queue.length > 0) {
    queue.sort((left, right) => left.cost - right.cost)
    const current = queue.shift()
    if (!current) break
    if (current.nodeId === destinationId) break
    if (current.cost > (distances.get(current.nodeId) ?? Number.POSITIVE_INFINITY)) continue

    const currentNode = nodes.get(current.nodeId)
    if (!currentNode) continue

    const edges = adjacency.get(current.nodeId) ?? []
    for (const edge of edges) {
      const nextNode = nodes.get(edge.to)
      if (!nextNode) continue
      const edgeCost = edge.cost ?? distanceBetween(currentNode.position, nextNode.position)
      const candidate = current.cost + edgeCost
      if (candidate >= (distances.get(nextNode.id) ?? Number.POSITIVE_INFINITY)) continue
      distances.set(nextNode.id, candidate)
      previous.set(nextNode.id, { nodeId: current.nodeId, edge })
      queue.push({ nodeId: nextNode.id, cost: candidate })
    }
  }

  if (!previous.has(destinationId)) {
    return null
  }

  const nodeIds = [destinationId]
  const edgeStatuses: RouteVerificationStatus[] = []
  const edgeNotes: Array<string | undefined> = []
  const nodeNotes: Array<string | undefined> = [nodes.get(destinationId)?.notes]
  let cursor = destinationId
  let totalCost = distances.get(destinationId) ?? Number.POSITIVE_INFINITY

  while (cursor !== startId) {
    const previousEntry = previous.get(cursor)
    if (!previousEntry) return null
    nodeIds.push(previousEntry.nodeId)
    edgeStatuses.push(previousEntry.edge.verificationStatus)
    edgeNotes.push(previousEntry.edge.notes)
    nodeNotes.push(nodes.get(previousEntry.nodeId)?.notes)
    cursor = previousEntry.nodeId
  }

  nodeIds.reverse()
  edgeStatuses.reverse()
  edgeNotes.reverse()
  nodeNotes.reverse()

  return {
    nodeIds,
    edgeStatuses,
    edgeNotes,
    nodeNotes,
    cost: totalCost,
  }
}

export function routeCostBetween(graph: NavigationGraph, fromId: string, toId: string) {
  const from = graph.nodes.find((node) => node.id === fromId)
  const to = graph.nodes.find((node) => node.id === toId)
  if (!from || !to) return Number.POSITIVE_INFINITY
  return distanceBetween(from.position, to.position)
}
