'use client'

import { ChevronLeft, ChevronRight, Sidebar } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React from 'react'
import { Button } from './ui/button'
import { LogOut, Home, Database, Settings, LucideIcon, User } from 'lucide-react'
import { SidebarTrigger } from './ui/sidebar'
import { Breadcrumb } from './ui/breadcrumb'
import { useData } from '@/contexts/DataContext'
import { ThemeToggle } from './ui/theme-toggle'

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbConfig {
  [key: string]: {
    items: BreadcrumbItem[];
  };
}

function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { clearData } = useData()


  // Breadcrumb configuration
  const breadcrumbConfig: BreadcrumbConfig = {
    '/': {
      items: [
        { label: 'Home', href: '/' }
      ]
    },
    '/validate': {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Data Validation', href: '/validate'}
      ]
    },
    '/ai': {
      items: [
        { label: 'Home', href: '/' },
        { label: 'AI Assistant', href: '/ai'},
      ]
    },
    '/rules': {
      items: [
        { label: 'Home', href: '/' },
        { label: 'Rules', href: '/rules'}
      ]
    }
  }

  // Get the current breadcrumb configuration
  const currentBreadcrumb = breadcrumbConfig[pathname] || {
    items: []
  }

  return (
    <nav className="bg-background sticky top-0 z-10 flex items-center gap-2 border-b p-4">
      <div className="flex justify-between items-center gap-4 w-full">

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SidebarTrigger />  
          {currentBreadcrumb.items.map((item: BreadcrumbItem, index: number) => {
            const isLast = index === currentBreadcrumb.items.length - 1
            
            return (
              <React.Fragment key={item.href}>
                <Link 
                  onClick={() => item.href === '/' && clearData()}
                  href={item.href}
                  className={`
                    flex items-center gap-1 
                    ${isLast ? 'text-foreground font-bold text-base' : 'hover:text-foreground/80 transition-colors text-base font-semibold'}
                  `}
                >
                  {item.label}
                </Link>
                {!isLast && <ChevronRight className="h-3 w-3" />}
              </React.Fragment>
            )
          })}
        </div>
        <ThemeToggle/>
      </div>
    </nav>
  )
}

export default Navbar