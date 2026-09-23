// Shared owner resolution for Brand Protection (assets + cases). Kept in its own
// module so the store and the case store can both use it without a cycle.

export type Owner = { ownerId: string; ownerType: "org" | "user" }
export type Actor = { id: string; organizationId: string | null }

/** Company-wide when the user belongs to an org; otherwise scoped to the user. */
export function ownerOf(user: Actor): Owner {
  return user.organizationId
    ? { ownerId: user.organizationId, ownerType: "org" }
    : { ownerId: user.id, ownerType: "user" }
}
