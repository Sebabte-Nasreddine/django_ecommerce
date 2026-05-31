'use client'
import { useEffect, useState, ComponentType } from 'react'
import { Truck, CreditCard, Tag, Gift, Phone, Star, Megaphone } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { advertisementApi } from '@/lib/api'

const ICON_MAP: Record<string, ComponentType<any>> = {
    truck:       Truck,
    credit_card: CreditCard,
    tag:         Tag,
    gift:        Gift,
    phone:       Phone,
    star:        Star,
    none:        Megaphone,
}

const DEFAULT_MESSAGES = [
    { icon: 'truck',       text: 'Livraison gratuite partout au Maroc' },
    { icon: 'credit_card', text: 'Paiement à la livraison' },
]

interface AdMessage {
    icon: string
    text: string
}

export function AnnouncementBar() {
    const pathname = usePathname()
    const [messages,  setMessages]  = useState<AdMessage[]>(DEFAULT_MESSAGES)
    const [current,   setCurrent]   = useState(0)
    const [visible,   setVisible]   = useState(true)

    // Fetch ads from API, fall back to defaults
    useEffect(() => {
        advertisementApi.list()
            .then((data: any[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setMessages(data.map(d => ({ icon: d.icon || 'none', text: d.text })))
                }
            })
            .catch(() => { /* keep defaults */ })
    }, [])

    // Rotate messages
    useEffect(() => {
        if (messages.length <= 1) return
        const interval = setInterval(() => {
            setVisible(false)
            setTimeout(() => {
                setCurrent(c => (c + 1) % messages.length)
                setVisible(true)
            }, 350)
        }, 3800)
        return () => clearInterval(interval)
    }, [messages.length])

    if (pathname.startsWith('/admin')) return null

    const msg  = messages[current] ?? DEFAULT_MESSAGES[0]
    const Icon = ICON_MAP[msg.icon] ?? Megaphone

    return (
        <div className="fixed top-0 left-0 right-0 bg-black z-[60]" style={{ height: '40px' }}>
            {/* Shimmer sweep */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                    style={{ animation: 'sweep 4s linear infinite', left: '-33%' }} />
            </div>

            {/* Dot indicators */}
            {messages.length > 1 && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-1 flex gap-1 z-10 pointer-events-none">
                    {messages.map((_, i) => (
                        <div key={i} style={{ transition: 'all 0.5s ease' }}
                            className={`rounded-full ${i === current ? 'w-4 h-[3px] bg-white' : 'w-[3px] h-[3px] bg-white/25'}`} />
                    ))}
                </div>
            )}

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
