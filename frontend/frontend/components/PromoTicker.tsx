import { Truck } from 'lucide-react'

const REPEAT = 10

export function PromoTicker() {
    return (
        <div className="overflow-hidden bg-brand-500 dark:bg-white py-3 border-y border-white/10 dark:border-black/10">
            <div
                className="flex whitespace-nowrap"
                style={{ animation: 'ticker 6s linear infinite' }}
            >
                {Array.from({ length: REPEAT }).map((_, i) => (
                    <span
                        key={i}
                        className="inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.28em] text-white dark:text-black font-medium px-10"
                    >
                        <Truck className="w-3 h-3 opacity-60 shrink-0" strokeWidth={1.5} />
                        Livraison gratuite partout au Maroc
                        <span className="opacity-20 ml-6">·</span>
                    </span>
                ))}
            </div>
        </div>
    )
}
