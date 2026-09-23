const labels: Record<string, string> = {
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.login_blocked": "Sign-in blocked (POC ended)",
  "auth.password_changed": "Changed own password",
  "user.created": "Created user",
  "user.updated": "Updated user",
  "user.password_reset": "Reset password",
  "user.disabled": "Disabled user",
  "user.enabled": "Re-enabled user",
  "user.deleted": "Deleted user",
  "customer.created": "Created customer",
  "customer.updated": "Updated customer",
  "customer.plan_changed": "Changed customer plan",
  "customer.deleted": "Deleted customer",
  "investigation.exported": "Downloaded investigation report",
  "connector.enabled": "Enabled connector",
  "connector.disabled": "Disabled connector",
  "connector.key_set": "Updated connector API key",
  "connector.key_removed": "Removed connector API key",
  // Entries written before organizations became customers.
  "organization.created": "Created customer",
  "organization.deleted": "Deleted customer",
}

export function auditLabel(action: string) {
  return labels[action] ?? action
}

/** Flattens audit metadata into a short, human-readable line. */
export function describeMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata) return ""
  return Object.entries(metadata)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.join(", ") || "—"}`
      if (value && typeof value === "object") return `${key}: ${JSON.stringify(value)}`
      return `${key}: ${value ?? "—"}`
    })
    .join(" · ")
}
