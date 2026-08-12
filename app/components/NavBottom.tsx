'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavBottom() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  const items = [
    { href: '/', label: 'Home', icon: '/home.svg' },
    { href: '/roadmaps', label: 'View roadmaps', icon: '/roadmap.svg' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '/leaderboard.svg' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex z-50 bg-primary">
      {items.map((item, i) => {
        const active = pathname === item.href
        return (
          <Link
            key={i}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-14 py-2 text-white text-xs sm:text-sm text-center ${
              active ? 'bg-black/15' : 'bg-transparent'
            }`}
          >
            <img
              src={item.icon}
              alt=""
              width={24}
              height={24}
              style={{ filter: 'brightness(0) invert(1)' }}
            />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}