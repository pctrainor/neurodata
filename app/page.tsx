'use client'

import Link from 'next/link'
import { 
  Brain, 
  Database, 
  Sparkles, 
  RefreshCw, 
  LayoutGrid, 
  CheckCircle2, 
  Link2, 
  BarChart3,
  ArrowRight,
  Github,
  FileText,
  Users,
  Zap,
  Shield,
  Globe,
  Wand2,
  Play,
  Check
} from 'lucide-react'

export default function HomePage() {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'NeuroData Hub'
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">{siteName}</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#data-sources" className="text-sm text-slate-400 hover:text-white transition-colors">
                Data Sources
              </Link>
              <Link href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/login" 
                className="px-4 py-2 text-sm font-medium text-white hover:text-indigo-300 transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href="/login?signup=true" 
                className="px-5 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/25"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-8">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-indigo-300">Open neuroscience data for everyone</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Build Brain Analysis</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Workflows with AI
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Describe your research goal in plain English and our AI Wizard will build the 
              complete analysis pipeline. No coding required. Access HCP, OpenNeuro, and Allen Atlas data.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/dashboard/workflows/new" 
                className="group flex items-center gap-2 px-8 py-4 text-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all shadow-xl shadow-purple-600/25"
              >
                <Wand2 className="h-5 w-5" />
                Try AI Wizard
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 px-8 py-4 text-lg font-medium border border-white/10 text-white rounded-xl hover:bg-white/5 transition-colors"
              >
                <Play className="h-5 w-5" />
                View Demo
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              <div className="text-center">
                <p className="text-4xl font-bold text-white">15K+</p>
                <p className="text-sm text-slate-400 mt-1">Studies</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-white">1M+</p>
                <p className="text-sm text-slate-400 mt-1">Brain Regions</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-white">500TB</p>
                <p className="text-sm text-slate-400 mt-1">Data Available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Everything You Need for Brain Research
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              A unified platform to discover, analyze, and share neuroimaging data
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Wand2}
              title="AI Workflow Wizard"
              description="Describe your research goal in plain English and AI builds the complete analysis pipeline automatically."
              gradient="from-purple-500 to-pink-600"
            />
            <FeatureCard 
              icon={Sparkles}
              title="AI-Powered Search"
              description="Find relevant studies with semantic search and AI-generated summaries of research findings."
              gradient="from-amber-500 to-orange-600"
            />
            <FeatureCard 
              icon={RefreshCw}
              title="Auto-Sync Sources"
              description="Data automatically synced from OpenNeuro, Allen Atlas, and HCP with daily updates."
              gradient="from-emerald-500 to-teal-600"
            />
            <FeatureCard 
              icon={LayoutGrid}
              title="Flexible Queries"
              description="Filter by modality, brain region, demographics, and clinical conditions."
              gradient="from-blue-500 to-cyan-600"
            />
            <FeatureCard 
              icon={CheckCircle2}
              title="Quality Metrics"
              description="Each dataset includes quality scores, completeness ratings, and validation status."
              gradient="from-purple-500 to-pink-600"
            />
            <FeatureCard 
              icon={Link2}
              title="BIDS Compatible"
              description="All data follows BIDS standard for seamless integration with analysis pipelines."
              gradient="from-rose-500 to-red-600"
            />
            <FeatureCard 
              icon={BarChart3}
              title="Visual Analytics"
              description="Interactive dashboards to explore trends, visualize brain regions, and track usage."
              gradient="from-indigo-500 to-violet-600"
            />
          </div>
        </div>
      </section>

      {/* Data Sources Section */}
      <section id="data-sources" className="py-24 bg-slate-900/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Connected Data Sources
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Aggregating open data from the world&apos;s leading neuroscience repositories
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <DataSourceCard 
              name="OpenNeuro"
              description="Free and open platform for sharing MRI, MEG, EEG, iEEG, and PET data."
              studies="700+"
              gradient="from-blue-500 to-indigo-600"
            />
            <DataSourceCard 
              name="Allen Brain Atlas"
              description="Comprehensive 3D atlas of the mouse and human brain with gene expression data."
              studies="1,300+"
              gradient="from-emerald-500 to-teal-600"
            />
            <DataSourceCard 
              name="Human Connectome Project"
              description="High-resolution brain imaging data from 1,200 healthy young adults."
              studies="8"
              gradient="from-purple-500 to-pink-600"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Start free, upgrade when you need more power
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard 
              name="Free"
              price="$0"
              description="Perfect for exploring the platform"
              features={[
                '3 workflows per month',
                'Basic node types',
                'Community templates',
                'OpenNeuro access',
                'Email support'
              ]}
              cta="Get Started"
              ctaLink="/login?signup=true"
              popular={false}
            />
            <PricingCard 
              name="Researcher"
              price="$49"
              description="For academic research teams"
              features={[
                'Unlimited workflows',
                'All node types',
                'AI Wizard generation',
                'HCP 1200 + Allen Atlas',
                'Export to BIDS format',
                'Priority support'
              ]}
              cta="Start Free Trial"
              ctaLink="/login?signup=true&plan=researcher"
              popular={true}
            />
            <PricingCard 
              name="Clinical"
              price="$199"
              description="For hospitals and clinics"
              features={[
                'Everything in Researcher',
                'TBI deviation reports',
                'Patient comparison tools',
                'HIPAA compliance',
                'Custom reference datasets',
                'Dedicated support'
              ]}
              cta="Contact Sales"
              ctaLink="/contact"
              popular={false}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 p-12 md:p-16">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-6">
                <Wand2 className="h-5 w-5 text-white" />
                <span className="text-sm font-medium text-white">AI-Powered Workflow Builder</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Build Your First Workflow in 30 Seconds
              </h2>
              <p className="text-lg text-purple-100 mb-8 max-w-2xl mx-auto">
                Just describe what you want to analyze. "Compare my TBI patient's brain to healthy controls" 
                — and watch the AI build your complete pipeline.
              </p>
              <Link 
                href="/dashboard/workflows/new" 
                className="inline-flex items-center gap-2 px-8 py-4 text-lg font-medium bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-colors shadow-xl"
              >
                <Wand2 className="h-5 w-5" />
                Try AI Wizard Now
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">{siteName}</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/dashboard/studies" className="text-sm text-slate-400 hover:text-white transition-colors">
                Studies
              </Link>
              <Link href="/dashboard/datasets" className="text-sm text-slate-400 hover:text-white transition-colors">
                Datasets
              </Link>
              <Link href="/dashboard/regions" className="text-sm text-slate-400 hover:text-white transition-colors">
                Brain Atlas
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} {siteName}. Built with Next.js & Supabase.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  gradient: string
}

function FeatureCard({ icon: Icon, title, description, gradient }: FeatureCardProps) {
  return (
    <div className="group p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all hover:border-white/20">
      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${gradient} mb-4`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  )
}

interface DataSourceCardProps {
  name: string
  description: string
  studies: string
  gradient: string
}

function DataSourceCard({ name, description, studies, gradient }: DataSourceCardProps) {
  return (
    <div className="group p-8 rounded-2xl border border-white/10 bg-slate-900/50 hover:bg-slate-900 transition-all">
      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} mb-6`}>
        <Database className="h-8 w-8 text-white" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
      <p className="text-slate-400 mb-4 leading-relaxed">{description}</p>
      <div className="flex items-center gap-2 text-sm">
        <FileText className="h-4 w-4 text-indigo-400" />
        <span className="text-indigo-300">{studies} datasets indexed</span>
      </div>
    </div>
  )
}

interface PricingCardProps {
  name: string
  price: string
  description: string
  features: string[]
  cta: string
  ctaLink: string
  popular: boolean
}

function PricingCard({ name, price, description, features, cta, ctaLink, popular }: PricingCardProps) {
  return (
    <div className={`relative p-8 rounded-2xl border ${popular ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5'} transition-all hover:border-white/20`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xs font-medium text-white">
          Most Popular
        </div>
      )}
      <h3 className="text-xl font-bold text-white mb-2">{name}</h3>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-4xl font-bold text-white">{price}</span>
        {price !== '$0' && <span className="text-slate-400">/month</span>}
      </div>
      <p className="text-sm text-slate-400 mb-6">{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
            <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Link 
        href={ctaLink}
        className={`block w-full text-center py-3 rounded-lg font-medium transition-colors ${
          popular 
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500' 
            : 'border border-white/20 text-white hover:bg-white/10'
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}
