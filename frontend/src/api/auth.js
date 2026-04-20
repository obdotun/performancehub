import { apiFetch } from './client'

// Login : pas de token JWT dans la requête (l'utilisateur n'est pas encore connecté)
// skipAuthRedirect: true → ne pas rediriger sur 401/403, gérer les erreurs localement
export const login = (body) =>
  apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuthRedirect: true,
    //skipToken: true,        // ne pas envoyer Authorization header
  })

export const changePassword = (body) =>
  apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const getUsers   = ()     => apiFetch('/users')
export const createUser = (body) => apiFetch('/users', { method: 'POST', body: JSON.stringify(body) })
export const deleteUser = (id)   => apiFetch(`/users/${id}`, { method: 'DELETE' })
export const toggleUser = (id)   => apiFetch(`/users/${id}/toggle`, { method: 'PATCH' })