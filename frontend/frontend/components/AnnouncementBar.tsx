'use client'
import { useEffect, useState } from 'react'
import { Truck, CreditCard } from 'lucide-react'
import { usePathname } from 'next/navigation'

const messages = [
    { icon: Truck,      text: 'Livraison gratuite partout au Maroc' },
    { icon: CreditCard, text: 'Paiement à la livraison' },
]

export function AnnouncementBar() {
    const pathname = usePathname()
    const [current, setCurrent] = useState(0)
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const interval = setInterval(() => {
            setVisible(false)
            setTimeout(() => {
                setCurrent(c => (c + 1) % messages.length)
                setVisible(true)
            }, 350)
        }, 3800)
        return () => clearInterval(interval)
    }, [])

    if (pathname.startsWith('/admin')) return null

    const msg = messages[current]
    const Icon = msg.icon

    return (
        <div className="fixed top-0 left-0 right-0 bg-black z-[60]" style={{ height: '40px' }}>
            {/* Shimmer sweep */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    style={{ animation: 'sweep 4s linear infinite', left: '-33%' }} />
            </div>

            {/* Dot indicators */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-1 flex gap-1 z-10 pointer-events-none">
                {messages.map((_, i) => (
                    <div key={i} style={{ transition: 'all 0.5s ease' }}
                        className={`rounded-full ${i === current ? 'w-4 h-[3px] bg-white' : 'w-[3px] h-[3px] bg-white/25'}`} />
                ))}
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-center gap-2 px-4 pb-1"
                style={{
                    opacity: visible ? 1 : 0,
                    transform: `translateY(${visible ? 0 : -5}px)`,
                    transition: 'opacity 0.35s ease, transform 0.35s ease',
                }}>
                <Icon className="w-3 h-3 text-white/50 shrink-0" strokeWidth={1.5} />
                <span className="text-white text-[10px] uppercase tracking-[0.22em] font-semibold whitespace-nowrap">
                    {msg.text}
                </span>
            </div>

            <style>{`
                @keyframes sweep {
                    0%   { left: -33%; }
                    100% { left: 133%; }
                }
            `}</style>
        </div>
    )
}
