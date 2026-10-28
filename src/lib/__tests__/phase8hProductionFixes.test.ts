import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { authService, VISITOR_USER } from '../../services/authService.ts'

describe('Phase 8H: Production Fixes Verification', () => {
  describe('Fix 1: Vercel SPA Routing & Workbox Navigation Fallback', () => {
    it('verifies vercel.json exists with universal SPA rewrite to index.html', () => {
      const vercelConfigPath = path.resolve(process.cwd(), 'vercel.json')
      assert.ok(fs.existsSync(vercelConfigPath), 'vercel.json must exist in project root')

      const raw = fs.readFileSync(vercelConfigPath, 'utf8')
      const config = JSON.parse(raw)

      assert.ok(Array.isArray(config.rewrites), 'vercel.json must define rewrites array')
      const spaRewrite = config.rewrites.find(
        (r: { source: string; destination: string }) =>
          r.source === '/(.*)' && r.destination === '/index.html'
      )
      assert.ok(spaRewrite, 'vercel.json must rewrite all SPA routes to /index.html')
    })

    it('verifies vercel.json enforces max-age=0 for sw.js to ensure immediate service worker updates', () => {
      const vercelConfigPath = path.resolve(process.cwd(), 'vercel.json')
      const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'))

      assert.ok(Array.isArray(config.headers), 'vercel.json must define headers array')
      const swHeaderConfig = config.headers.find((h: { source: string }) => h.source === '/sw.js')
      assert.ok(swHeaderConfig, 'Header rule for /sw.js must be configured')

      const cacheControl = swHeaderConfig.headers.find(
        (kv: { key: string; value: string }) => kv.key.toLowerCase() === 'cache-control'
      )
      assert.ok(cacheControl, 'Cache-Control header must be defined for /sw.js')
      assert.ok(
        cacheControl.value.includes('max-age=0') && cacheControl.value.includes('must-revalidate'),
        'sw.js must require immediate revalidation (max-age=0, must-revalidate)'
      )
    })

    it('verifies vite.config.ts configures navigateFallback to /index.html and enables cache cleanup', () => {
      const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts')
      const content = fs.readFileSync(viteConfigPath, 'utf8')

      assert.ok(
        content.includes("navigateFallback: '/index.html'"),
        "navigateFallback must be '/index.html' so SPA refreshes boot index.html instead of offline.html"
      )
      assert.ok(
        !content.includes("navigateFallback: '/offline.html'"),
        "navigateFallback must never be '/offline.html'"
      )
      assert.ok(
        content.includes('cleanupOutdatedCaches: true'),
        'cleanupOutdatedCaches must be enabled to clear stale app versions'
      )
      assert.ok(content.includes('clientsClaim: true'), 'clientsClaim must be enabled')
      assert.ok(content.includes('skipWaiting: true'), 'skipWaiting must be enabled')
    })
  })

  describe('Fix 2: Role Entry & Visitor Mode Storage Isolation', () => {
    beforeEach(async () => {
      await authService.logout()
    })

    afterEach(async () => {
      await authService.logout()
    })

    it('unauthenticated state has null session by default', () => {
      assert.equal(authService.getSession(), null, 'Fresh unauthenticated visit must have null session')
      assert.equal(authService.isAuthenticated(), false, 'isAuthenticated must be false')
      assert.equal(authService.getRole(), 'visitor', 'getRole() provides baseline visitor permission fallback')
    })

    it('starts visitor mode ONLY upon explicit loginAsVisitor() invocation', () => {
      assert.equal(authService.getSession(), null, 'Session starts as null before explicit choice')

      const session = authService.loginAsVisitor()
      assert.ok(session !== null, 'Explicit visitor selection must produce a session')
      assert.equal(session.user.role, 'visitor')
      assert.equal(session.user.id, VISITOR_USER.id)
      assert.equal(authService.isAuthenticated(), false, 'Visitor must not be authenticated as student/admin')
    })

    it('logging out resets session to null and returns to login state', async () => {
      authService.loginAsVisitor()
      assert.ok(authService.getSession() !== null)

      await authService.logout()
      assert.equal(authService.getSession(), null, 'Logout must completely clear the session')
      assert.equal(authService.isAuthenticated(), false)
    })

    it('student login produces authenticated student session and cleans visitor session', async () => {
      authService.loginAsVisitor()
      const res = await authService.login('student', 'student', 'student@demo2026')

      assert.equal(res.success, true)
      assert.equal(authService.getRole(), 'student')
      assert.equal(authService.isAuthenticated(), true)
      assert.equal(authService.getUser()?.role, 'student')

      await authService.logout()
      assert.equal(authService.getSession(), null)
    })

    it('admin login produces authenticated admin session with operations permissions', async () => {
      const res = await authService.login('admin', 'admin', 'admin@demo2026')

      assert.equal(res.success, true)
      assert.equal(authService.getRole(), 'admin')
      assert.equal(authService.isAuthenticated(), true)
      assert.equal(authService.getUser()?.role, 'admin')

      await authService.logout()
      assert.equal(authService.getSession(), null)
    })
  })

  describe('Fix 3: Password Show/Hide Toggle Implementation Verification', () => {
    it('verifies LoginRoleScreen component source includes password toggle buttons and Lucide Eye/EyeOff icons', () => {
      const screenPath = path.resolve(process.cwd(), 'src', 'screens', 'LoginRoleScreen.tsx')
      const content = fs.readFileSync(screenPath, 'utf8')

      assert.ok(content.includes('Eye'), 'LoginRoleScreen must import Eye icon')
      assert.ok(content.includes('EyeOff'), 'LoginRoleScreen must import EyeOff icon')
      assert.ok(
        content.includes('showStudentPassword'),
        'LoginRoleScreen must declare showStudentPassword state'
      )
      assert.ok(
        content.includes('showAdminPassword'),
        'LoginRoleScreen must declare showAdminPassword state'
      )
      assert.ok(
        content.includes('btn-toggle-student-password'),
        'LoginRoleScreen must provide student password toggle button with dedicated id'
      )
      assert.ok(
        content.includes('btn-toggle-admin-password'),
        'LoginRoleScreen must provide admin password toggle button with dedicated id'
      )
      assert.ok(
        content.includes("aria-label={showStudentPassword ? 'Hide password' : 'Show password'}"),
        'Accessible aria-label must be used for student toggle'
      )
      assert.ok(
        content.includes("aria-label={showAdminPassword ? 'Hide password' : 'Show password'}"),
        'Accessible aria-label must be used for admin toggle'
      )
      assert.ok(
        content.includes("type={showStudentPassword ? 'text' : 'password'}"),
        'Dynamic type="text" and type="password" switching must be implemented for student'
      )
      assert.ok(
        content.includes("type={showAdminPassword ? 'text' : 'password'}"),
        'Dynamic type="text" and type="password" switching must be implemented for admin'
      )
    })
  })

  describe('Fix 4: Safety & Security Guardrails Preservation', () => {
    it('preserves strict live outdoor navigation lock in default geofence configuration', async () => {
      const { PROVISIONAL_CAMPUS_BOUNDARY } = await import('../../data/campusGeofenceData.ts')
      assert.strictEqual(PROVISIONAL_CAMPUS_BOUNDARY.metadata.isApprovedForLiveNavigation, false)
    })

    it('preserves authoritative campus model configuration and destinations', async () => {
      const { CAMPUS_MODEL_CONFIG } = await import('../../data/campusModelMapping.ts')
      assert.equal(CAMPUS_MODEL_CONFIG.activeVersion, 'Stage_E4')
      assert.equal(CAMPUS_MODEL_CONFIG.activeModelPath, '/models/MNMJEC_Campus_Stage_E4_Web.glb')
      assert.equal(CAMPUS_MODEL_CONFIG.rollbackModelPath, '/models/MNMJEC_Campus_Stage_E3_Web.glb')
    })
  })
})
