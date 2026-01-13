'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  User, 
  GraduationCap, 
  Beaker, 
  BookOpen, 
  Briefcase,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Play,
  Youtube,
  TrendingUp,
  Target,
  Users,
  BarChart3,
  Zap,
  Video,
  Gamepad2,
  Music,
  Newspaper,
  Heart,
  Plane,
  DollarSign,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface WelcomeWizardProps {
  userEmail?: string
  userName?: string
  onComplete: (data: OnboardingData) => Promise<void>
}

export interface OnboardingData {
  full_name: string
  institution: string
  role: string
  research_interests: string[]
  background?: string
  experience_level?: string
  content_interests?: string[]
  content_goals?: string[]
}

// Professional backgrounds
const BACKGROUNDS = [
  { id: 'marketing', label: 'Marketing Professional', icon: TrendingUp, description: 'Brand strategy & campaigns' },
  { id: 'content_creator', label: 'Content Creator', icon: Video, description: 'YouTube, TikTok, podcasts' },
  { id: 'business_owner', label: 'Business Owner', icon: Briefcase, description: 'Entrepreneur or founder' },
  { id: 'agency', label: 'Agency Professional', icon: Users, description: 'Creative or marketing agency' },
  { id: 'student', label: 'Student', icon: GraduationCap, description: 'Learning content strategy' },
  { id: 'researcher', label: 'Researcher', icon: Beaker, description: 'Academic or industry research' },
]

// Experience levels
const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Just getting started' },
  { id: 'intermediate', label: 'Intermediate', description: '1-3 years experience' },
  { id: 'advanced', label: 'Advanced', description: '3-7 years experience' },
  { id: 'expert', label: 'Expert', description: '7+ years experience' },
]

// Content interests (what types of content they want to analyze)
const CONTENT_INTERESTS = [
  { id: 'tech_reviews', label: 'Tech Reviews', icon: Zap },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'education', label: 'Education', icon: BookOpen },
  { id: 'entertainment', label: 'Entertainment', icon: Play },
  { id: 'sports', label: 'Sports', icon: Target },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'lifestyle', label: 'Lifestyle', icon: Heart },
  { id: 'news', label: 'News & Politics', icon: Newspaper },
  { id: 'science', label: 'Science', icon: Beaker },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'travel', label: 'Travel', icon: Plane },
]

// Content goals
const CONTENT_GOALS = [
  { id: 'grow_audience', label: 'Grow Audience', icon: Users, description: 'Attract more viewers' },
  { id: 'increase_engagement', label: 'Boost Engagement', icon: TrendingUp, description: 'More likes, comments, shares' },
  { id: 'improve_quality', label: 'Improve Quality', icon: Sparkles, description: 'Better production value' },
  { id: 'learn_trends', label: 'Learn Trends', icon: BarChart3, description: 'Stay ahead of what works' },
  { id: 'competitor_analysis', label: 'Analyze Competitors', icon: Target, description: 'Understand what others do' },
  { id: 'monetization', label: 'Monetization', icon: DollarSign, description: 'Increase revenue' },
]

interface VideoSuggestion {
  title: string
  creator: string
  url: string
  reason: string
  category: string
}

const STEPS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'profile', title: 'Profile' },
  { id: 'background', title: 'Background' },
  { id: 'interests', title: 'Interests' },
  { id: 'goals', title: 'Goals' },
  { id: 'discover', title: 'Discover' },
  { id: 'complete', title: 'All Set!' },
]

export function WelcomeWizard({ userEmail, userName, onComplete }: WelcomeWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [videoSuggestions, setVideoSuggestions] = useState<VideoSuggestion[]>([])
  const [selectedVideo, setSelectedVideo] = useState<VideoSuggestion | null>(null)
  const [formData, setFormData] = useState<OnboardingData>({
    full_name: userName || '',
    institution: '',
    role: '',
    research_interests: [],
    background: '',
    experience_level: '',
    content_interests: [],
    content_goals: [],
  })

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      if (STEPS[currentStep + 1].id === 'discover' && videoSuggestions.length === 0) {
        setCurrentStep(currentStep + 1)
        await discoverVideos()
      } else {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const discoverVideos = async () => {
    setIsDiscovering(true)
    try {
      const response = await fetch('/api/discover-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          background: formData.background,
          experience_level: formData.experience_level,
          content_interests: formData.content_interests,
          platforms: ['youtube'],
          content_goals: formData.content_goals,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setVideoSuggestions(data.suggestions || [])
        if (data.suggestions?.length > 0) {
          setSelectedVideo(data.suggestions[0])
        }
      }
    } catch (error) {
      console.error('Error discovering videos:', error)
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      await onComplete(formData)
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTryDemo = async () => {
    setIsSubmitting(true)
    try {
      await onComplete(formData)
      if (selectedVideo) {
        const params = new URLSearchParams({
          template: 'content-impact-analyzer',
          videoUrl: selectedVideo.url,
          videoTitle: selectedVideo.title,
          creator: selectedVideo.creator,
        })
        router.push(`/dashboard/workflows/new?${params.toString()}`)
      } else {
        router.push('/dashboard/workflows/new?template=content-impact-analyzer')
      }
    } catch (error) {
      console.error('Error starting demo:', error)
      setIsSubmitting(false)
    }
  }

  const toggleInterest = (interestId: string) => {
    setFormData(prev => ({
      ...prev,
      content_interests: prev.content_interests?.includes(interestId)
        ? prev.content_interests.filter(i => i !== interestId)
        : [...(prev.content_interests || []), interestId]
    }))
  }

  const toggleGoal = (goalId: string) => {
    setFormData(prev => ({
      ...prev,
      content_goals: prev.content_goals?.includes(goalId)
        ? prev.content_goals.filter(g => g !== goalId)
        : [...(prev.content_goals || []), goalId]
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true
      case 1: return formData.full_name.trim().length > 0
      case 2: return formData.background && formData.background.length > 0
      case 3: return (formData.content_interests?.length || 0) > 0
      case 4: return true
      case 5: return true
      case 6: return true
      default: return false
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl mx-4">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-1">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300',
                    index < currentStep 
                      ? 'bg-green-500 text-white' 
                      : index === currentStep 
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/30' 
                        : 'bg-slate-800 text-slate-500'
                  )}
                >
                  {index < currentStep ? <Check className="h-3 w-3" /> : index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div 
                    className={cn(
                      'w-8 h-0.5 mx-0.5 transition-all duration-300',
                      index < currentStep ? 'bg-green-500' : 'bg-slate-700'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card container */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-8 overflow-y-auto flex-1"
            >
              {/* Step 0: Welcome */}
              {currentStep === 0 && (
                <div className="text-center">
                  {/* Animated brain with glow effect */}
                  <div className="relative inline-flex mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                    <div className="relative p-5 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl">
                      <Brain className="h-14 w-14 text-white" />
                    </div>
                  </div>
                  
                  <h1 className="text-4xl font-bold text-white mb-4">
                    Welcome to{' '}
                    <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      NeuroCompute
                    </span>
                  </h1>
                  
                  <p className="text-xl text-slate-300 mb-3 max-w-lg mx-auto font-medium">
                    Unleash <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-bold">unlimited AI power</span> to decode what makes content go viral.
                  </p>
                  <p className="text-slate-400 mb-8 max-w-md mx-auto">
                    Build intelligent workflows that analyze any content — instantly understand hooks, thumbnails, engagement patterns, and the psychology behind viral success.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
                    <div className="group bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 text-center border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300">
                      <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Zap className="h-8 w-8 text-cyan-400 mx-auto mb-2 relative" />
                      </div>
                      <p className="text-sm font-semibold text-white">Unlimited</p>
                      <p className="text-xs text-slate-400">Analysis Power</p>
                    </div>
                    <div className="group bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 text-center border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300">
                      <div className="relative">
                        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Brain className="h-8 w-8 text-purple-400 mx-auto mb-2 relative" />
                      </div>
                      <p className="text-sm font-semibold text-white">AI Agents</p>
                      <p className="text-xs text-slate-400">Work For You</p>
                    </div>
                    <div className="group bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 text-center border border-slate-700/50 hover:border-pink-500/50 transition-all duration-300">
                      <div className="relative">
                        <div className="absolute inset-0 bg-pink-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                        <TrendingUp className="h-8 w-8 text-pink-400 mx-auto mb-2 relative" />
                      </div>
                      <p className="text-sm font-semibold text-white">10x Growth</p>
                      <p className="text-xs text-slate-400">Potential</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <span>Join 10,000+ creators already scaling their content</span>
                  </div>
                </div>
              )}

              {/* Step 1: Profile */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 text-center">Tell us about yourself</h2>
                  <p className="text-slate-400 mb-8 text-center">This helps us personalize your experience</p>
                  
                  <div className="space-y-6 max-w-md mx-auto">
                    <div>
                      <Label htmlFor="full_name" className="text-slate-300">Full Name *</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Your name"
                        className="mt-2 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="institution" className="text-slate-300">Company / Organization</Label>
                      <Input
                        id="institution"
                        value={formData.institution}
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                        placeholder="Acme Inc."
                        className="mt-2 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
                      />
                    </div>
                    {userEmail && (
                      <div>
                        <Label className="text-slate-300">Email</Label>
                        <div className="mt-2 px-3 py-2 bg-slate-800/30 border border-slate-700/50 rounded-md text-slate-400">
                          {userEmail}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Background */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 text-center">What&apos;s your background?</h2>
                  <p className="text-slate-400 mb-6 text-center">Select your primary role</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setFormData({ ...formData, background: bg.id, role: bg.id })}
                        className={cn(
                          'p-4 rounded-xl border-2 text-left transition-all duration-200',
                          formData.background === bg.id
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        )}
                      >
                        <bg.icon className={cn(
                          'h-6 w-6 mb-2',
                          formData.background === bg.id ? 'text-indigo-400' : 'text-slate-400'
                        )} />
                        <p className="font-medium text-white text-sm">{bg.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{bg.description}</p>
                      </button>
                    ))}
                  </div>

                  {formData.background && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Label className="text-slate-300 mb-3 block">Experience Level</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {EXPERIENCE_LEVELS.map((level) => (
                          <button
                            key={level.id}
                            onClick={() => setFormData({ ...formData, experience_level: level.id })}
                            className={cn(
                              'p-3 rounded-lg border text-center transition-all duration-200',
                              formData.experience_level === level.id
                                ? 'border-indigo-500 bg-indigo-500/10'
                                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                            )}
                          >
                            <p className="font-medium text-white text-sm">{level.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{level.description}</p>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Step 3: Content Interests */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 text-center">What content interests you?</h2>
                  <p className="text-slate-400 mb-6 text-center">Select categories you want to analyze</p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {CONTENT_INTERESTS.map((interest) => (
                      <button
                        key={interest.id}
                        onClick={() => toggleInterest(interest.id)}
                        className={cn(
                          'p-3 rounded-xl border text-left transition-all duration-200 flex items-center gap-2',
                          formData.content_interests?.includes(interest.id)
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        )}
                      >
                        <interest.icon className={cn(
                          'h-4 w-4',
                          formData.content_interests?.includes(interest.id) ? 'text-indigo-400' : 'text-slate-400'
                        )} />
                        <span className="font-medium text-white text-sm">{interest.label}</span>
                        {formData.content_interests?.includes(interest.id) && (
                          <Check className="h-3 w-3 text-indigo-400 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Goals */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 text-center">What are your goals?</h2>
                  <p className="text-slate-400 mb-6 text-center">What do you want to achieve? (optional)</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {CONTENT_GOALS.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => toggleGoal(goal.id)}
                        className={cn(
                          'p-4 rounded-xl border-2 text-left transition-all duration-200',
                          formData.content_goals?.includes(goal.id)
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                        )}
                      >
                        <goal.icon className={cn(
                          'h-5 w-5 mb-2',
                          formData.content_goals?.includes(goal.id) ? 'text-indigo-400' : 'text-slate-400'
                        )} />
                        <p className="font-medium text-white text-sm">{goal.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{goal.description}</p>
                        {formData.content_goals?.includes(goal.id) && (
                          <Check className="h-4 w-4 text-indigo-400 mt-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Video Discovery */}
              {currentStep === 5 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 text-center">
                    {isDiscovering ? 'Finding videos for you...' : 'Try it out!'}
                  </h2>
                  <p className="text-slate-400 mb-6 text-center">
                    {isDiscovering 
                      ? 'AI is finding trending videos that match your interests' 
                      : 'We found videos you might want to analyze'}
                  </p>
                  
                  {isDiscovering ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="relative">
                        <Brain className="h-16 w-16 text-indigo-500 animate-pulse" />
                        <div className="absolute inset-0 h-16 w-16 border-4 border-indigo-500/30 rounded-full animate-ping" />
                      </div>
                      <p className="text-slate-400 mt-4 text-sm">Analyzing your interests...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {videoSuggestions.map((video, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedVideo(video)}
                          className={cn(
                            'w-full p-4 rounded-xl border-2 text-left transition-all duration-200',
                            selectedVideo?.url === video.url
                              ? 'border-red-500 bg-red-500/10'
                              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                          )}
                        >
                          <div className="flex items-start gap-4">
                            <div className="bg-red-600 rounded-lg p-3 flex-shrink-0">
                              <Youtube className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{video.title}</p>
                              <p className="text-sm text-slate-400">{video.creator}</p>
                              <p className="text-xs text-slate-500 mt-2 line-clamp-2">{video.reason}</p>
                            </div>
                            {selectedVideo?.url === video.url && (
                              <Check className="h-5 w-5 text-red-400 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      ))}
                      
                      {videoSuggestions.length === 0 && !isDiscovering && (
                        <div className="text-center py-8">
                          <p className="text-slate-400">No videos found. Try the demo with a default video!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 6: Complete */}
              {currentStep === 6 && (
                <div className="text-center">
                  {/* Celebration animation */}
                  <div className="relative inline-flex mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl blur-xl opacity-60 animate-pulse" />
                    <div className="relative p-5 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-2xl">
                      <Sparkles className="h-14 w-14 text-white" />
                    </div>
                  </div>
                  
                  <h2 className="text-4xl font-bold text-white mb-3">
                    You&apos;re Ready to{' '}
                    <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                      Dominate
                    </span>
                  </h2>
                  <p className="text-xl text-slate-300 mb-2 max-w-md mx-auto">
                    Welcome, <span className="text-white font-semibold">{formData.full_name.split(' ')[0]}</span>!
                  </p>
                  <p className="text-slate-400 mb-8 max-w-md mx-auto">
                    Your personalized AI workflows are ready. Let&apos;s decode what makes content go viral.
                  </p>
                  
                  {selectedVideo && (
                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-4 max-w-md mx-auto mb-6 text-left border border-slate-700/50">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-xs text-green-400 uppercase tracking-wide font-medium">Ready to analyze</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="bg-red-600 rounded-lg p-2">
                          <Youtube className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm truncate">{selectedVideo.title}</p>
                          <p className="text-xs text-slate-400">{selectedVideo.creator}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 max-w-sm mx-auto">
                    <Button
                      onClick={handleTryDemo}
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-500 hover:via-pink-500 hover:to-orange-400 text-white px-8 py-6 text-lg shadow-xl shadow-purple-500/25 border-0"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Launching...
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 mr-2" />
                          Start Analyzing Now
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleComplete}
                      disabled={isSubmitting}
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                    >
                      Go to Dashboard
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                  
                  <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Unlimited analyses</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>AI-powered insights</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="h-3 w-3 text-green-500" />
                      <span>Cancel anytime</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="px-8 pb-8 flex justify-between border-t border-slate-800 pt-4">
            {currentStep > 0 && currentStep < 6 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-slate-400 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <div />
            )}
            
            {currentStep < 5 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300"
              >
                {currentStep === 0 ? "Activate My AI Brain" : 'Continue'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : currentStep === 5 ? (
              <Button
                onClick={handleNext}
                disabled={isDiscovering}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
