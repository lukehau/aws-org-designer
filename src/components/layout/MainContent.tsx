import { Card } from "@/components/ui/card"
import { OrganizationTreeProvider } from "@/components/OrganizationTree"
import { ContentLoadingScreen } from "@/components/ui/loading-screen"
import { useAppStore } from "@/store"

interface MainContentProps {
  children?: React.ReactNode
}

export function MainContent({ children }: MainContentProps) {
  const { isLoading } = useAppStore()
  
  return (
    <Card className="h-full rounded-none border-t-0 border-r-0 border-b-0 min-w-0">
      <div className="relative h-full w-full overflow-hidden">
        {/* Loading overlay for this content area only */}
        {isLoading && (
          <ContentLoadingScreen />
        )}
        
        {/* Main content */}
        {children || <OrganizationTreeProvider />}
      </div>
    </Card>
  )
}