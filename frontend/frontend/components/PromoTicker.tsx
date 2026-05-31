'use client'
import { useEffect, useState } from 'react'
import { Truck, CreditCard, Tag, Gift, Phone, Star, Megaphone, ComponentType } from 'lucide-react'
import { advertisementApi } from '@/lib/api'

const ICON_MAP: Record<string, any> = {
    truck:       Truck,
    credit_card: CreditCard,
    tag:         Tag,
    gift:        Gift,
    phone:       Phone,
    star:        Star,
    none:        Megaphone,
}

const DEFAULT = [{ icon: 'truck', text: 'Livraison gratuite partout au Maroc' }]

const REPEAT = 8

export function PromoTicker() {
    const [items, setItems] = useState(DEFAULT)

    useEffect(() => {
        advertisementApi.list()
            .then((data: any[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    setItems(data.map(d => ({ icon: d.icon || 'none', text: d.text })))
                }
            })
            .catch(() => { /* keep default */ })
    }, [])

    return (
        <div className="overflow-hidden bg-brand-500 dark:bg-white py-3 border-y border-white/10 dark:border-black/10">
            <div
                className="flex whitespace-nowrap"
                style={{ animation: 'ticker 12s linear infinite' }}
            >
                {Array.from({ length: REPEAT }).map((_, repeat) =>
                    items.map((item, i) => {
                        const Icon = ICON_MAP[item.icon] ?? Megaphone
                        return (
                            <span
                                key={`${repeat}-${i}`}
                                className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] text-white dark:text-black font-medium px-10"
                            >
                                <Icon className="w-3 h-3 opacity-60 shrink-0" strokeWidth={1.5} />
                                {item.text}
                                <span className="opacity-20 ml-6">·</span>
                            </span>
                        )
                    })
                )}
            </div>
        </div>
    )
}
