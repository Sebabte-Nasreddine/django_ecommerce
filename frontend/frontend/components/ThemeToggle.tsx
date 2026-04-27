'use client'
import { useTheme } from './ThemeProvider'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle({ solid }: { solid: boolean }) {
    const { theme, toggle } = useTheme()
    return (
        <button
            onClick={toggle}
            aria-label="Changer le thème"
            className={`transition-colors duration-300 ${solid
                ? 'text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white'
                : 'text-white/50 hover:text-white'
            }`}
        >
            {theme === 'dark'
                ? <Sun  className="w-4 h-4" strokeWidth={1.5} />
                : <Moon className="w-4 h-4" strokeWidth={1.5} />
            }
        </button>
    )
}
