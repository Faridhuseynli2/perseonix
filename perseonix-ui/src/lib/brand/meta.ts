// Shared by server and client components: no server-only imports here.

export const BRAND_MODULE_KEY = "brand"
export const BRAND_MODULE_NAME = "Brand Protection"

export type DetectionStatus = "new" | "malicious" | "benign" | "monitoring"

export const STATUS_LABEL: Record<DetectionStatus, string> = {
  new: "New",
  malicious: "Confirmed",
  benign: "Benign",
  monitoring: "Monitoring",
}

export const SEVERITY_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
}
