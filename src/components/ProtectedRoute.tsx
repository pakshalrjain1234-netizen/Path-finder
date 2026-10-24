import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { role, isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  // Wait for auth initialization before performing redirects
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#101827] flex items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#60A5FA] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#94A3B8] font-semibold tracking-wide">
            Verifying Campus Session...
          </span>
        </div>
      </div>
    )
  }

  // If the route requires authentication and the user is a visitor, redirect
  if (!allowedRoles.includes(role)) {
    // If user is a visitor trying to access student or admin features, send to login
    return <Navigate to={redirectTo} state={{ from: location.pathname, unauthorized: true }} replace />
  }

  // Double check authentication state for student/admin routes
  if (allowedRoles.some((r) => r !== 'visitor') && !isAuthenticated && role === 'visitor') {
    return <Navigate to={redirectTo} state={{ from: location.pathname, unauthorized: true }} replace />
  }

  return <>{children}</>
}
