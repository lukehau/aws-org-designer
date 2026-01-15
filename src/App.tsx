import { useEffect } from 'react'
import { toast } from 'sonner'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ErrorPanel } from '@/components/ErrorPanel'
import { ThemeProvider } from '@/components/theme-provider'

import { Toaster } from '@/components/ui/sonner'
import { useAppStore } from '@/store'

// Import Driver.js CSS
import 'driver.js/dist/driver.css'
// Import custom Driver.js theme
import '@/styles/driver-theme.css'

function App() {
  
  const { 
    validationErrors,
    hasValidationErrors,
    setShowErrorPanel,
    sidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    initializeFromLocalStorage,
  } = useAppStore()

  // Initialize persistence system on app startup
  useEffect(() => {
    initializeFromLocalStorage()
  }, [initializeFromLocalStorage])

  // Handle window resize for responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024 // lg breakpoint
      
      if (isMobile && sidebarOpen) {
        // Auto-close sidebar when transitioning to mobile
        setSidebarOpen(false)
      } else if (!isMobile && !sidebarOpen) {
        // Auto-open sidebar when transitioning back to desktop
        setSidebarOpen(true)
      }
    }

    // Add event listener
    window.addEventListener('resize', handleResize)
    
    // Also listen for orientation change on mobile devices
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure dimensions are updated after orientation change
      setTimeout(handleResize, 100)
    })

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [sidebarOpen, setSidebarOpen])

  // Monitor validation errors and show error panel when needed
  useEffect(() => {
    if (hasValidationErrors() && validationErrors.length > 0) {
      // Auto-show error panel when validation errors occur
      setShowErrorPanel(true)
      
      // Show toast for validation errors
      if (validationErrors.length === 1) {
        toast.error(validationErrors[0].message)
      } else if (validationErrors.length > 1) {
        toast.error('Multiple Validation Issues', {
          description: `Found ${validationErrors.length} validation issues that need attention.`,
          action: {
            label: 'View Details',
            onClick: () => setShowErrorPanel(true),
          },
        })
      }
    }
  }, [validationErrors, hasValidationErrors, setShowErrorPanel])

  const handleAppError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log error for debugging
    console.error('App Error:', error, errorInfo)
    toast.error('An unexpected error occurred', {
      description: error.message,
    })
  }

  const handleComponentError = (component: string) => (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`${component} Error:`, error, errorInfo)
    toast.error(`Error in ${component}`, {
      description: error.message,
    })
  }

  return (
    <ThemeProvider>
      <ErrorBoundary onError={handleAppError}>
        <div className="h-screen flex flex-col bg-background">
          {/* Skip link for screen readers */}
          <a 
            href="#main-content" 
            className="skip-link"
            onFocus={(e) => e.currentTarget.scrollIntoView()}
          >
            Skip to main content
          </a>
          
          {/* Header */}
          <Header 
            onToggleSidebar={toggleSidebar} 
            sidebarOpen={sidebarOpen}
          />
          
          {/* Main Layout */}
          <div className="flex flex-1 overflow-hidden" data-tutorial-id="workspace-area">
            {/* Sidebar - Responsive with overlay on mobile */}
            <div className={`
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              fixed inset-y-0 left-0 z-50 w-80 transition-transform duration-300 ease-in-out
              lg:relative lg:translate-x-0 lg:z-auto
              ${sidebarOpen ? 'lg:flex-shrink-0' : 'lg:w-0 lg:overflow-hidden'}
            `}>
              <ErrorBoundary onError={handleComponentError('Sidebar')}>
                <Sidebar />
              </ErrorBoundary>
            </div>
            
            {/* Sidebar Overlay for mobile */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={toggleSidebar}
                aria-hidden="true"
              />
            )}
            
            {/* Main Content Area */}
            <main id="main-content" className="flex-1 min-w-0" role="main" aria-label="Organization visualization">
              <ErrorBoundary onError={handleComponentError('MainContent')}>
                <MainContent />
              </ErrorBoundary>
            </main>
          </div>

          {/* Error Panel */}
          <ErrorPanel />
          
          {/* Toast System */}
          <Toaster />
        </div>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
