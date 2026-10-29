/**
 * Teams, roles and plans. A team is where people read reports their colleagues
 * chose to share; personal reports never leave their owner otherwise.
 */

export const TEAM_ROLES = ['owner', 'admin', 'analyst', 'viewer'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

/** Roles an invitation or a role change can grant; ownership is never handed out this way. */
export const ASSIGNABLE_TEAM_ROLES = ['admin', 'analyst', 'viewer'] as const satisfies readonly TeamRole[]
export type AssignableTeamRole = (typeof ASSIGNABLE_TEAM_ROLES)[number]

export const PLAN_IDS = ['free', 'team', 'business'] as const
export type PlanId = (typeof PLAN_IDS)[number]

export interface PlanLimits {
  /** People in the team, the owner included. */
  members: number
  /** Reports shared into the team. */
  sharedReports: number
}

/** The single source of plan limits for the API and the interface. */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { members: 3, sharedReports: 10 },
  team: { members: 10, sharedReports: 100 },
  business: { members: 50, sharedReports: 1000 },
}

/** How many teams one person may own, whatever the plan; keeps free teams from multiplying. */
export const OWNED_TEAMS_LIMIT = 5

/** Invitation links stop working after this long. */
export const TEAM_INVITE_TTL_DAYS = 7

export type TeamAction =
  'read' | 'shareReports' | 'manageReports' | 'manageMembers' | 'manageInvites' | 'rename' | 'readAudit' | 'delete'

const ROLE_ACTIONS: Record<TeamRole, readonly TeamAction[]> = {
  owner: ['read', 'shareReports', 'manageReports', 'manageMembers', 'manageInvites', 'rename', 'readAudit', 'delete'],
  admin: ['read', 'shareReports', 'manageReports', 'manageMembers', 'manageInvites', 'rename', 'readAudit'],
  analyst: ['read', 'shareReports'],
  viewer: ['read'],
}

export function teamCan(role: TeamRole, action: TeamAction) {
  return ROLE_ACTIONS[role].includes(action)
}

export function teamPermissions(role: TeamRole): Record<TeamAction, boolean> {
  const actions: TeamAction[] = [
    'read',
    'shareReports',
    'manageReports',
    'manageMembers',
    'manageInvites',
    'rename',
    'readAudit',
    'delete',
  ]
  return Object.fromEntries(actions.map((action) => [action, teamCan(role, action)])) as Record<TeamAction, boolean>
}

/** Whether `actor` may change or remove a member who holds `target`. The owner is untouchable. */
export function canManageMember(actor: TeamRole, target: TeamRole) {
  return teamCan(actor, 'manageMembers') && target !== 'owner'
}
