'use client'

import React, { useState, useEffect, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'
import { CreditsDisplay } from '@/components/credits-display'
import { NeurodataLogoCompact } from '@/components/ui/neurodata-logo'
import {
  Brain,
  Database,
  Home,
  Layers,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Workflow,
  ShoppingBag,
  LogOut,
  User,
  Upload,
  FileText,
} from 'lucide-react'
import { useTheme } from 'next-themes'

// Sidebar context for state management
const SidebarContext = createContext<{
  isCollapsed: boolean
  setIsCollapsed: (value: boolean) => void
  isMobileOpen: boolean
  setIsMobileOpen: (value: boolean) => void
}>({
  isCollapsed: false,
  setIsCollapsed: () => {},
  isMobileOpen: false,
  setIsMobileOpen: () => {},
})

export function useSidebar() {
  return useContext(SidebarContext)
}

// Navigation items - Workflows first as primary focus
const mainNavItems = [
  { 
    href: '/dashboard/workflows', 
    icon: Activity, 
    label: 'My Workflows',
    description: 'Your saved pipelines'
  },
  { 
    href: '/dashboard/reports', 
    icon: FileText, 
    label: 'Reports',
    description: 'Generated reports'
  },
  { 
    href: '/dashboard', 
    icon: Home, 
    label: 'Dashboard',
    description: 'Overview & stats'
  },
]

const computeNavItems = [
  { 
    href: '/dashboard/marketplace', 
    icon: ShoppingBag, 
    label: 'Marketplace',
    description: 'Pre-built workflows'
  },
  { 
    href: '/dashboard/algorithms', 
    icon: Workflow, 
    label: 'Algorithms',
    description: 'Pre-built modules'
  },
]

const dataNavItems = [
  { 
    href: '/dashboard/regions', 
    icon: Brain, 
    label: 'Brain Atlas',
    description: 'Anatomical regions'
  },
  { 
    href: '/dashboard/datasets', 
    icon: Database, 
    label: 'Datasets',
    description: 'BIDS/OpenNeuro'
  },
  { 
    href: '/dashboard/data-sources', 
    icon: Upload, 
    label: 'Your Data',
    description: 'Upload CSV & Excel'
  },
  // Data Sources hidden per user request - not serving a purpose currently
  // { 
  //   href: '/dashboard/sources', 
  //   icon: Layers, 
  //   label: 'Data Sources',
  //   description: 'Connected sources'
  // },
]

const settingsNavItems = [
  { 
    href: '/dashboard/settings', 
    icon: Settings, 
    label: 'Settings',
    description: 'Preferences'
  },
]

interface NavItemProps {
  href: string
  icon: React.ElementType
  label: string
  description?: string
  isCollapsed: boolean
  isActive: boolean
}

function NavItem({ href, icon: Icon, label, description, isCollapsed, isActive }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150',
        'hover:bg-accent group relative',
        isActive 
          ? 'bg-accent text-foreground' 
          : 'text-muted-foreground hover:text-foreground',
        isCollapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn(
        'h-4 w-4 shrink-0 transition-colors',
        isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
      )} />
      
      {!isCollapsed && (
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium block truncate">{label}</span>
        </div>
      )}
      
      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground 
                        text-xs rounded shadow-lg border border-border opacity-0 group-hover:opacity-100 
                        transition-opacity pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </Link>
  )
}

interface NavSectionProps {
  title: string
  items: typeof mainNavItems
  isCollapsed: boolean
  pathname: string
}

function NavSection({ title, items, isCollapsed, pathname }: NavSectionProps) {
  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <h3 className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider mb-2">
          {title}
        </h3>
      )}
      {items.map((item) => (
        <NavItem
          key={item.href}
          {...item}
          isCollapsed={isCollapsed}
          isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
        />
      ))}
    </div>
  )
}

export function Sidebar() {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar()
  const pathname = usePathname()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch by only rendering theme toggle after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname, setIsMobileOpen])

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-background border-r border-border',
          'transition-all duration-300 ease-in-out flex flex-col',
          // Desktop: always visible
          'hidden md:flex',
          isCollapsed ? 'md:w-16' : 'md:w-64',
        )}
      >
        {/* Logo Header */}
        <div className={cn(
          'h-14 flex items-center border-b border-border shrink-0',
          isCollapsed ? 'justify-center px-2' : 'px-4'
        )}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <NeurodataLogoCompact isCollapsed={isCollapsed} />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          <NavSection title="Overview" items={mainNavItems} isCollapsed={isCollapsed} pathname={pathname} />
          <NavSection title="Compute" items={computeNavItems} isCollapsed={isCollapsed} pathname={pathname} />
          <NavSection title="Data" items={dataNavItems} isCollapsed={isCollapsed} pathname={pathname} />
          <NavSection title="Settings" items={settingsNavItems} isCollapsed={isCollapsed} pathname={pathname} />
        </nav>

        {/* Footer Actions */}
        <div className={cn(
          'border-t border-border p-2 shrink-0 space-y-1',
          isCollapsed && 'flex flex-col items-center'
        )}>
          {/* Theme Toggle - only render after mount to prevent hydration mismatch */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg w-full',
              'text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors',
              isCollapsed && 'justify-center px-2'
            )}
          >
            {mounted ? (
              resolvedTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )
            ) : (
              <div className="h-5 w-5" /> // Placeholder to prevent layout shift
            )}
            {!isCollapsed && <span className="text-sm">Toggle Theme</span>}
          </button>

          {/* Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg w-full',
              'text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors',
              isCollapsed && 'justify-center px-2'
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
      
      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen bg-background border-r border-border w-72',
          'transition-transform duration-300 ease-in-out flex flex-col md:hidden',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Mobile Header with Close */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={() => setIsMobileOpen(false)}>
            <NeurodataLogoCompact isCollapsed={false} />
          </Link>
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          <NavSection title="Overview" items={mainNavItems} isCollapsed={false} pathname={pathname} />
          <NavSection title="Compute" items={computeNavItems} isCollapsed={false} pathname={pathname} />
          <NavSection title="Data" items={dataNavItems} isCollapsed={false} pathname={pathname} />
          <NavSection title="Settings" items={settingsNavItems} isCollapsed={false} pathname={pathname} />
        </nav>

        {/* Mobile Footer */}
        <div className="border-t border-border p-2 shrink-0 space-y-1">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg w-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            {mounted ? (
              resolvedTheme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )
            ) : (
              <div className="h-5 w-5" />
            )}
            <span className="text-sm">Toggle Theme</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// Top Header Bar
export function Header() {
  const { isCollapsed, isMobileOpen, setIsMobileOpen } = useSidebar()
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const userInitial = user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'
  
  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-14 bg-background border-b border-border',
        'flex items-center justify-between px-4 md:px-6 transition-all duration-300',
        'left-0 md:left-64',
        isCollapsed && 'md:left-16'
      )}
    >
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="p-2 rounded-lg hover:bg-accent transition-colors md:hidden"
      >
        <Menu className="h-5 w-5 text-muted-foreground" />
      </button>
      
      {/* Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl ml-2 md:ml-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search workflows, reports, datasets..."
            className="w-full h-9 pl-10 pr-4 rounded-md bg-transparent border border-border
                       text-sm placeholder:text-muted-foreground
                       focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30
                       transition-colors"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 
                          px-1.5 py-0.5 text-[10px] text-muted-foreground bg-muted rounded border border-border hidden sm:block">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Credits Display */}
        <CreditsDisplay variant="compact" />

        <div className="h-6 w-px bg-border" />

        {/* Settings */}
        <Link 
          href="/dashboard/settings"
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Settings className="h-5 w-5 text-muted-foreground" />
        </Link>

        {/* User Avatar with Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/60 
                       flex items-center justify-center text-primary-foreground text-sm font-medium
                       hover:opacity-90 transition-opacity"
          >
            {userInitial}
          </button>
          
          {showUserMenu && (
            <>
              {/* Backdrop to close menu */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)} 
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-popover border border-border shadow-lg z-50">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email || 'Not signed in'}
                  </p>
                </div>
                
                <div className="p-1">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-foreground 
                               rounded-md hover:bg-accent transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile Settings
                  </Link>
                  
                  {user ? (
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 
                                 rounded-md hover:bg-accent transition-colors w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-primary 
                                 rounded-md hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign In
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// Main Layout Shell
interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false)
  }, [])

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Header />
        <main
          className={cn(
            'pt-14 min-h-screen transition-all duration-300',
            'pl-0 md:pl-64',
            isCollapsed && 'md:pl-16'
          )}
        >
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarContext.Provider>
  )
}
