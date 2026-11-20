import type { Access, FieldAccess, Where } from 'payload'

type RoleUser = { roles?: string[] | null } | null | undefined

export const hasRole = (user: RoleUser, role: 'admin' | 'editor') =>
  Boolean(user?.roles?.includes(role))

export const anyone: Access = () => true
export const nobody: Access = () => false
export const loggedIn: Access = ({ req }) => Boolean(req.user)
export const adminOnly: Access = ({ req }) => hasRole(req.user, 'admin')
export const adminOnlyField: FieldAccess = ({ req }) => hasRole(req.user, 'admin')

/** Public sees only published docs; signed-in editors see everything. */
export const publishedOrLoggedIn: Access = ({ req }) => {
  if (req.user) return true
  const where: Where = { published: { equals: true } }
  return where
}

/** Admins see all users; everyone else sees only themselves. Anonymous sees nothing. */
export const adminOrSelf: Access = ({ req }) => {
  if (!req.user) return false
  if (hasRole(req.user, 'admin')) return true
  return { id: { equals: req.user.id } }
}
