'use client'
import { usePathname } from 'next/navigation'

const WA_NUMBER = '212695240522'
const WA_URL = `https://wa.me/${WA_NUMBER}`

export function WhatsAppButton() {
    const pathname = usePathname()
    if (pathname.startsWith('/admin')) return null

    return (
        <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contacter sur WhatsApp"
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg shadow-black/20 transition-transform duration-200 hover:scale-110 active:scale-95"
            style={{ background: '#25D366' }}
        >
            <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.003 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.347.613 4.587 1.787 6.547L2.667 29.333l6.973-1.76A13.267 13.267 0 0 0 16.003 29.333c7.36 0 13.33-5.973 13.33-13.333S23.363 2.667 16.003 2.667zm0 24.267a11.04 11.04 0 0 1-5.6-1.52l-.4-.24-4.147 1.053 1.08-3.947-.267-.413A10.96 10.96 0 0 1 5.003 16c0-6.053 4.947-11 11-11s11 4.947 11 11-4.947 11-11 11zm6.04-8.24c-.333-.167-1.96-.96-2.267-1.067-.306-.107-.52-.16-.746.16-.227.32-.88 1.067-1.08 1.28-.2.213-.4.24-.733.08-.334-.16-1.4-.52-2.667-1.654-.987-.88-1.654-1.96-1.854-2.293-.2-.334-.02-.52.147-.68.153-.147.334-.387.5-.587.167-.2.227-.333.334-.56.106-.226.053-.427-.027-.6-.08-.173-.747-1.8-1.027-2.466-.267-.64-.547-.547-.747-.547h-.64c-.213 0-.56.08-.853.4-.294.32-1.12 1.094-1.12 2.667s1.147 3.094 1.307 3.307c.16.213 2.24 3.52 5.52 4.8.773.333 1.373.533 1.84.68.773.24 1.48.2 2.04.12.626-.093 1.96-.8 2.24-1.573.28-.773.28-1.44.2-1.573-.08-.134-.293-.214-.627-.374z"/>
            </svg>
        </a>
    )
}
