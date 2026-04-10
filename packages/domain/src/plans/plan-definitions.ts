/** Available subscription plan identifiers. */
export type PlanId = 'free' | 'pro'

/** Hard limits enforced per subscription plan. -1 means unlimited. */
export interface PlanLimits {
  readonly maxProjects: number
  readonly maxMembersPerProject: number
  readonly maxTasksPerProject: number
}

/** Plan limits keyed by PlanId. */
export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxProjects: 3, maxMembersPerProject: 5, maxTasksPerProject: 50 },
  pro: { maxProjects: -1, maxMembersPerProject: -1, maxTasksPerProject: -1 },
}
