import { OrganizationTreeProvider } from "@/components/OrganizationTree"
import { ContentLoadingScreen } from "@/components/ui/loading-screen"
import { useAppStore } from "@/store"

interface MainContentProps {
  children?: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { isLoading } = useAppStore()
  
  return (
    <main className="h-full bg-card min-w-0">
      <div className="relative h-full w-full overflow-hidden">
        {/* Loading overlay for this content area only */}
        {isLoading && (
          <ContentLoadingScreen />
        )}
        
        {/* Main content */}
        {children || <OrganizationTreeProvider />}
      </div>
    </main>
  )
}