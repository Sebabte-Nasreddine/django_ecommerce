'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

const Ctx = createContext<{ theme: Theme; toggle: () => void }>({
    theme: 'light',
    toggle: () => {},
})

export function useTheme() { return useContext(Ctx) }

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light')

    useEffect(() => {
        const saved = localStorage.getItem('sefa_theme') as Theme | null
        const preferred = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        apply(preferred)
        setTheme(preferred)
    }, [])

    function apply(t: Theme) {
        document.documentElement.classList.toggle('dark', t === 'dark')
    }

    function toggle() {
        const next: Theme = theme === 'light' ? 'dark' : 'light'
        apply(next)
        localStorage.setItem('sefa_theme', next)
        setTheme(next)
    }

    return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>
}
