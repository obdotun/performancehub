import React, { createContext, useContext, useState, useCallback } from 'react'

const AuthContext = createContext(null)

function loadStoredAuth() {
  try {
    const stored = localStorage.getItem('perfhub_auth')
    if (!stored || stored === 'undefined' || stored === 'null') {
      localStorage.removeItem('perfhub_auth')
      return null
    }
    const parsed = JSON.parse(stored)
    // Vérifier que l'objet est valide (contient un token)
    return parsed?.token ? parsed : null
  } catch {
    localStorage.removeItem('perfhub_auth')
    return null
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(loadStoredAuth)

  const login = useCallback((data) => {
    if (!data || !data.token) {
      console.error('login() appelé avec des données invalides:', data)
      return
    }
    localStorage.setItem('perfhub_auth', JSON.stringify(data))
    setAuth(data)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('perfhub_auth')
    setAuth(null)
  }, [])

  const hasRole = useCallback((minRole) => {
    if (!auth) return false
    const hierarchy = ['VIEWER', 'PERF_ENGINEER', 'PERF_LEAD', 'ADMIN']
    return hierarchy.indexOf(auth.role) >= hierarchy.indexOf(minRole)
  }, [auth])

  return (
    <AuthContext.Provider value={{ auth, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)