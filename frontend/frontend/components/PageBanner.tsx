interface PageBannerProps {
    label?: string
    title: string
    subtitle?: string
}

export function PageBanner({ label, title, subtitle }: PageBannerProps) {
    return (
        <div className="bg-white dark:bg-[#111] border-b border-black/[0.05] dark:border-white/[0.06] py-16 md:py-20">
            <div className="container-xl">
                {label && (
                    <p className="text-black/30 dark:text-white/30 text-[9px] uppercase tracking-[0.4em] mb-4">{label}</p>
                )}
                <h1 className="font-serif text-4xl md:text-6xl font-black text-brand-500 dark:text-white tracking-tight">{title}</h1>
                {subtitle && (
                    <p className="text-black/30 dark:text-white/30 text-[9px] uppercase tracking-[0.3em] mt-4">{subtitle}</p>
                )}
            </div>
        </div>
    )
}
