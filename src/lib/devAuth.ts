/**
 * Developer Navigation Test Authorization Check
 *
 * The developer navigation test suite and /dev-navigation route are development-only
 * utilities. They are strictly inaccessible in production builds (import.meta.env.DEV !== true)
 * to ensure that regular campus users and students can never trigger simulated
 * movements, mock scenarios, or unverified coordinates.
 */
export function isDevTestAuthorized(customEnv?: { DEV?: boolean }): boolean {
  const env = customEnv ?? (typeof import.meta !== 'undefined' ? import.meta.env : undefined)
  return Boolean(env?.DEV)
}
