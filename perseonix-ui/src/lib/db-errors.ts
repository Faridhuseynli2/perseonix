type PgErrorFields = { code?: unknown; constraint?: unknown }

function pgFields(error: unknown): PgErrorFields | undefined {
  return typeof error === "object" && error !== null ? (error as PgErrorFields) : undefined
}

/**
 * True for Postgres unique-constraint violations, whether or not the driver
 * wrapped them. Pass `constraint` to match one specific index.
 */
export function isUniqueViolation(error: unknown, constraint?: string) {
  const candidates = [pgFields(error), pgFields((error as { cause?: unknown } | null)?.cause)]
  return candidates.some(
    (fields) =>
      fields?.code === "23505" && (constraint === undefined || fields.constraint === constraint)
  )
}
