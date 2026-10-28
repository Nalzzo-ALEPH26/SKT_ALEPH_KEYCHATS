export type PendingPasswordResetRequest = {
  id: string
  userId: string
  username: string
  displayName: string
  requestedAt: string
  expiresAt: string
}

export type PasswordResetStatus =
  | { status: 'pending' }
  | { status: 'expired' }
  | { status: 'issued'; temporaryPassword: string }
