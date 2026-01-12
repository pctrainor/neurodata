'use client'

import { useEffect, useState } from 'react'
import { 
  Brain, 
  FileText, 
  Database, 
  Users, 
  Activity, 
  TrendingUp,
  Download,
  Clock,
  AlertCircle,
  CheckCircle2,
  Layers,
  Beaker
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Stats Card Component
function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend,
  color = 'primary'
}: { 
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: { value: number; label: string }
  color?: 'primary' | 'blue' | 'purple' | 'green' | 'orange'
}) {
  const colorClasses = {
    primary: 'from-primary/20 to-primary/5 text-primary',
    blue: 'from-blue-500/20 to-blue-500/5 text-blue-500',
    purple: 'from-purple-500/20 to-purple-500/5 text-purple-500',
    green: 'from-green-500/20 to-green-500/5 text-green-500',
    orange: 'from-orange-500/20 to-orange-500/5 text-orange-500',
  }

  return (
    <Card className="relative overflow-hidden">
      <div className={cn(
        'absolute top-0 right-0 w-32 h-32 bg-gradient-to-br rounded-full -translate-y-1/2 translate-x-1/2 opacity-50',
        colorClasses[color]
      )} />
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-green-500">+{trend.value}%</span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-xl bg-gradient-to-br',
            colorClasses[color]
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Data Source Status Component
function DataSourceCard({ 
  name, 
  status, 
  lastSync, 
  itemCount,
  icon: Icon
}: { 
  name: string
  status: 'synced' | 'syncing' | 'error'
  lastSync: string
  itemCount: number
  icon: React.ElementType
}) {
  const statusConfig = {
    synced: { icon: CheckCircle2, color: 'text-green-500', label: 'Synced' },
    syncing: { icon: Activity, color: 'text-blue-500', label: 'Syncing...' },
    error: { icon: AlertCircle, color: 'text-red-500', label: 'Error' },
  }
  
  const StatusIcon = statusConfig[status].icon

  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{itemCount.toLocaleString()} items</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className={cn('flex items-center gap-1 text-sm', statusConfig[status].color)}>
            <StatusIcon className="h-4 w-4" />
            <span>{statusConfig[status].label}</span>
          </div>
          <p className="text-xs text-muted-foreground">{lastSync}</p>
        </div>
      </div>
    </div>
  )
}

// Recent Studies Component
function RecentStudyRow({ 
  title, 
  source, 
  modalities, 
  subjects 
}: { 
  title: string
  source: string
  modalities: string[]
  subjects: number
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">{source}</Badge>
          {modalities.slice(0, 2).map((mod) => (
            <Badge key={mod} variant="outline" className="text-xs">{mod}</Badge>
          ))}
        </div>
      </div>
      <div className="text-right ml-4">
        <p className="text-sm font-medium">{subjects}</p>
        <p className="text-xs text-muted-foreground">subjects</p>
      </div>
    </div>
  )
}

// Quick Actions Component
function QuickActions() {
  const actions = [
    { label: 'Browse Studies', href: '/dashboard/studies', icon: FileText },
    { label: 'Brain Regions', href: '/dashboard/regions', icon: Brain },
    { label: 'Datasets', href: '/dashboard/datasets', icon: Database },
    { label: 'Data Sources', href: '/dashboard/sources', icon: Layers },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <Button 
              variant="outline" 
              className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary"
            >
              <action.icon className="h-5 w-5 text-primary" />
              <span className="text-xs">{action.label}</span>
            </Button>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

// Main Dashboard Page
export default function DashboardPage() {
  const [stats, setStats] = useState({
    studies: 23,
    brainRegions: 204,
    datasets: 6,
    totalSubjects: 8531,
  })

  const dataSources = [
    { name: 'OpenNeuro', status: 'synced' as const, lastSync: '2h ago', itemCount: 15, icon: Database },
    { name: 'HCP', status: 'synced' as const, lastSync: '2h ago', itemCount: 8, icon: Layers },
    { name: 'Allen Atlas', status: 'synced' as const, lastSync: '2h ago', itemCount: 204, icon: Brain },
  ]

  const recentStudies = [
    { title: 'UCLA Neuropsychiatric Phenomics', source: 'OpenNeuro', modalities: ['T1w', 'BOLD'], subjects: 272 },
    { title: 'HCP Young Adult 1200', source: 'HCP', modalities: ['fMRI', 'dMRI'], subjects: 1200 },
    { title: 'Midnight Scan Club (MSC)', source: 'OpenNeuro', modalities: ['BOLD', 'T1w'], subjects: 10 },
    { title: 'HCP Lifespan Development', source: 'HCP', modalities: ['MRI', 'fMRI'], subjects: 1500 },
    { title: 'Forrest Gump 7T', source: 'OpenNeuro', modalities: ['fMRI', 'T1w'], subjects: 20 },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Your neuroscience command center
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Studies"
          value={stats.studies}
          subtitle="All sources"
          icon={FileText}
          color="blue"
          trend={{ value: 15, label: 'this week' }}
        />
        <StatCard
          title="Brain Regions"
          value={stats.brainRegions}
          subtitle="Allen Atlas"
          icon={Brain}
          color="purple"
        />
        <StatCard
          title="Datasets"
          value={stats.datasets}
          subtitle="Ready to use"
          icon={Database}
          color="green"
        />
        <StatCard
          title="Subjects"
          value={stats.totalSubjects.toLocaleString()}
          subtitle="Total across studies"
          icon={Users}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Data Sources - 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Data Sources</CardTitle>
              <CardDescription>Connected repositories</CardDescription>
            </div>
            <Link href="/dashboard/sources">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {dataSources.map((source) => (
              <DataSourceCard key={source.name} {...source} />
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions - 1 column */}
        <QuickActions />
      </div>

      {/* Recent Studies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Studies</CardTitle>
            <CardDescription>Newly added datasets</CardDescription>
          </div>
          <Link href="/dashboard/studies">
            <Button variant="outline" size="sm">Browse All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {recentStudies.map((study, i) => (
              <RecentStudyRow key={i} {...study} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modalities Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modalities</CardTitle>
          <CardDescription>Available data types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              { name: 'T1w', count: 14, color: 'blue' },
              { name: 'BOLD', count: 13, color: 'purple' },
              { name: 'dMRI', count: 5, color: 'green' },
              { name: 'fMRI', count: 8, color: 'orange' },
              { name: 'PET', count: 2, color: 'pink' },
              { name: 'T2w', count: 2, color: 'cyan' },
              { name: 'EEG', count: 1, color: 'yellow' },
              { name: 'Fieldmap', count: 2, color: 'indigo' },
            ].map((mod) => (
              <div 
                key={mod.name}
                className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
              >
                <span className="font-medium">{mod.name}</span>
                <Badge variant="secondary">{mod.count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
