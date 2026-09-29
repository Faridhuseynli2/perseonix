"use server"

import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"
import { buildGraph, expandGraphNode, type GraphFragment } from "@/lib/investigate/graph"
import { TargetError } from "@/lib/investigate/target"

export type StartResult =
  | { ok: true; rootId: string; kind: string; fragment: GraphFragment }
  | { ok: false; error: string }

export async function startGraphAction(indicator: string): Promise<StartResult> {
  await requireModule(INVESTIGATE_MODULE_KEY)
  try {
    const { rootId, kind, fragment } = await buildGraph(indicator)
    return { ok: true, rootId, kind, fragment }
  } catch (error) {
    const msg = error instanceof TargetError ? error.message : "Could not build the graph for that indicator."
    return { ok: false, error: msg }
  }
}

export async function expandNodeAction(kind: string, value: string): Promise<GraphFragment> {
  await requireModule(INVESTIGATE_MODULE_KEY)
  try {
    return await expandGraphNode(kind, value)
  } catch {
    return { nodes: [], edges: [] }
  }
}
