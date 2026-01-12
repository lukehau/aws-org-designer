import { useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ErrorPanel } from '@/components/ErrorPanel'
import { ThemeProvider } from '@/components/theme-provider'

import { Toaster } from '@/components/ui/sonner'
import { useAppStore } from '@/store'
import { setupGlobalErrorHandling, errorHandlingService, ErrorCategory, ErrorSeverity } from '@/services/errorHandlingService'
import { useSonnerToast } from '@/hooks/use-sonner-toast'

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

  const { 
    showErrorToast, 
    showValidationErrorToast 
  } = useSonnerToast()

  // Initialize persistence system and error handling on app startup
  useEffect(() => {
    // Setup global error handling
    setupGlobalErrorHandling()
    
    // Register error service callback to show toast notifications
    errorHandlingService.onError('app-toast-handler', (error) => {
      const toast = errorHandlingService.createToastFromError(error)
      if (error.category === ErrorCategory.VALIDATION) {
        // For validation errors, we might want to show them differently
        console.log('Validation error handled:', error)
      } else {
        showErrorToast(toast.title, toast.description, toast.action)
      }
    })

    // Initialize from localStorage
    initializeFromLocalStorage()

    return () => {
      // Cleanup error handler
      errorHandlingService.offError('app-toast-handler')
    }
  }, [showErrorToast, initializeFromLocalStorage])

  // Handle window resize for responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024 // lg breakpoint
      
      // Only auto-close sidebar when transitioning to mobile
      // Don't auto-open when transitioning to desktop (respect user preference)
      if (isMobile && sidebarOpen) {
        setSidebarOpen(false)
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
      
      // Show toast for the first validation error
      if (validationErrors.length === 1) {
        showValidationErrorToast(validationErrors[0])
      } else if (validationErrors.length > 1) {
        showErrorToast(
          'Multiple Validation Issues',
          `Found ${validationErrors.length} validation issues that need attention.`,
          {
            label: 'View Details',
            onClick: () => setShowErrorPanel(true),
          }
        )
      }
    }
  }, [validationErrors, hasValidationErrors, setShowErrorPanel, showValidationErrorToast, showErrorToast])

  const handleAppError = (error: Error, errorInfo: any) => {
    // Handle React error boundary errors
    errorHandlingService.handleException(
      error, 
      ErrorCategory.SYSTEM, 
      ErrorSeverity.HIGH,
      { errorInfo, component: 'App' }
    )
  }



  return (
    <ThemeProvider>
      <ErrorBoundary onError={handleAppError}>
        <div className="h-screen flex flex-col bg-background">
          {/* Loading Screen - Removed: Now handled in MainContent */}
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
              <ErrorBoundary onError={(error, errorInfo) => 
                errorHandlingService.handleException(error, ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM, { errorInfo, component: 'Sidebar' })
              }>
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
              <ErrorBoundary onError={(error, errorInfo) => 
                errorHandlingService.handleException(error, ErrorCategory.SYSTEM, ErrorSeverity.MEDIUM, { errorInfo, component: 'MainContent' })
              }>
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
