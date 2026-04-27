'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
    email: string
    firstName: string
    lastName: string
    role: string
}

interface AuthStore {
    token: string | null
    user: User | null
    setAuth: (token: string, user: User) => void
    logout: () => void
    isAdmin: () => boolean
    isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            setAuth: (token, user) => {
                set({ token, user })
            },
            logout: () => {
                set({ token: null, user: null })
            },
            isAdmin: () => get().user?.role === 'ROLE_ADMIN',
            isAuthenticated: () => !!get().token,
        }),
        { name: 'sefa_auth', partialize: (s) => ({ token: s.token, user: s.user }) }
    )
)
