'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { AuthProvider } from '@/lib/auth/auth-context'
import { RevenueCatProvider } from '@/lib/revenuecat/revenuecat-context'

// Las devtools solo se montan en desarrollo: no deben acabar en el bundle del .apk.
const isDev = process.env.NODE_ENV !== 'production'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RevenueCatProvider>
          {children}
        </RevenueCatProvider>
      </AuthProvider>
      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
