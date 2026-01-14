import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/theme-context'
import { AuthProvider } from '@/contexts/auth-context'
import { DataProvider } from '@/contexts/data-context'

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
})

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'NeuroData Hub'

export const metadata: Metadata = {
  title: `${siteName} - Neural Computing Platform`,
  description: 'Harness 100+ neural network nodes to analyze content with AI-powered workflows.',
  keywords: ['neurocomputing', 'AI', 'brain', 'neural network', 'workflow', 'content analysis'],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
    other: [
      { rel: 'android-chrome', url: '/android-chrome-192x192.svg', sizes: '192x192' },
      { rel: 'android-chrome', url: '/android-chrome-512x512.svg', sizes: '512x512' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#18181b" />
      </head>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <DataProvider>
              {children}
            </DataProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
