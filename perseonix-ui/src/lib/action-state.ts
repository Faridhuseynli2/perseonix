/** Sign-in details handed back once, right after an account or password is created. */
export type Credentials = {
  name: string
  email: string
  password: string
  loginUrl: string
  mustChangePassword: boolean
}

/** Result shape shared by every form-backed Server Action. */
export type ActionState = {
  error?: string
  success?: string
  fieldErrors?: Partial<Record<string, string[]>>
  /** Submitted values echoed back so fields keep their input after a failed save. */
  values?: Record<string, string | string[]>
  /** Generated credentials to show the admin once. Never persisted in plain text. */
  credentials?: Credentials
  /** The record a create action just made, for follow-up links. */
  created?: { id: string; label: string }
}
