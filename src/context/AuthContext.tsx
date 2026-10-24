import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  authService,
  getRolePermissions,
  VISITOR_USER,
} from '../services/authService'
import type { AuthSession, RolePermissions, User, UserRole } from '../types/auth'

interface AuthContextValue {
  session: AuthSession | null
  user: User
  role: UserRole
  isAuthenticated: boolean
  isVisitor: boolean
  isStudent: boolean
  isAdmin: boolean
  isDemo: boolean
  isInitializing: boolean
  permissions: RolePermissions
  login: (role: 'admin' | 'student', username?: string, password?: string) => Promise<{ success: boolean; error?: string }>
  loginAsVisitor: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => authService.getSession())
  const [isInitializing, setIsInitializing] = useState<boolean>(true)

  useEffect(() => {
    let active = true

    authService.waitForInit().then(() => {
      if (active) {
        setSession(authService.getSession())
        setIsInitializing(false)
      }
    })

    const unsubscribe = authService.onAuthChange((nextSession) => {
      if (active) {
        setSession(nextSession)
        setIsInitializing(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const user = session?.user ?? VISITOR_USER
  const role: UserRole = user.role
  const isAuthenticated = Boolean(session && role !== 'visitor')
  const isVisitor = role === 'visitor'
  const isStudent = role === 'student'
  const isAdmin = role === 'admin'
  const isDemo = Boolean(session?.isDemo)

  const permissions = useMemo(() => getRolePermissions(role), [role])

  const login = async (loginRole: 'admin' | 'student', username?: string, password?: string) => {
    const res = await authService.login(loginRole, username, password)
    return { success: res.success, error: res.error }
  }

  const loginAsVisitor = () => {
    authService.loginAsVisitor()
  }

  const logout = async () => {
    await authService.logout()
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      role,
      isAuthenticated,
      isVisitor,
      isStudent,
      isAdmin,
      isDemo,
      isInitializing,
      permissions,
      login,
      loginAsVisitor,
      logout,
    }),
    [session, user, role, isAuthenticated, isVisitor, isStudent, isAdmin, isDemo, isInitializing, permissions]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
