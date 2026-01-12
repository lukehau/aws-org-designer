/**
 * Header Component
 * Application header with title, navigation, and responsive mobile menu
 */

import { Button } from "@/components/ui/button"
import { Menu, X, Download, Upload, Trash2, Camera } from "lucide-react"
import { AWSIcon } from "@/components/icons/aws-icons"
import { useAppStore } from "@/store"
import { useState, useRef } from "react"
import { toast } from "sonner"

interface HeaderProps {
  onToggleSidebar?: () => void
  sidebarOpen?: boolean
}

export function Header({ onToggleSidebar, sidebarOpen }: HeaderProps) {
  const { organization, exportOrganization, importOrganization, clearOrganization, isSaving, getOrganizationVersion, downloadOrganizationImage } = useAppStore()
  const [fileInputKey, setFileInputKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDownloadingImage, setIsDownloadingImage] = useState(false)

  const handleExport = async () => {
    if (!organization) return

    try {
      await exportOrganization()
    } catch (error) {
      console.error('Failed to export organization:', error)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'application/json') {
      importOrganization(file).catch(error => {
        console.error('Failed to import organization:', error)
      })
    } else if (file) {
      alert('Please select a valid JSON file')
    }
    // Reset file input
    setFileInputKey(prev => prev + 1)
  }

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    clearOrganization()
  }

  const handleDownloadImage = async () => {
    if (!organization) return

    setIsDownloadingImage(true)
    try {
      await downloadOrganizationImage()
      toast.success('Image Downloaded', {
        description: 'Organization diagram has been saved as an image.'
      })
    } catch (error) {
      console.error('Failed to download image:', error)
      toast.error('Download Failed', {
        description: 'Failed to download organization diagram. Please try again.'
      })
    } finally {
      setIsDownloadingImage(false)
    }
  }

  return (
    <header className="border-b bg-card">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <AWSIcon type="root" size="xlg" className="flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">AWS Organization Designer</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {organization ? (
                  <span>
                    {organization.name} - v{getOrganizationVersion()}
                  </span>
                ) : (
                  'No organization loaded'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              key={fileInputKey}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              className="hidden"
            />

            {/* File operations */}
            <div className="flex items-center space-x-2" data-tutorial-id="header-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadImage}
                disabled={!organization || isDownloadingImage}
                title="Download organization diagram as image"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">
                  {isDownloadingImage ? 'Downloading...' : 'Download Image'}
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!organization || isSaving}
                title="Export organization as JSON file"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Export</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                title="Import organization from JSON file"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Import</span>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={handleClear}
                title="Clear current organization"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Clear</span>
              </Button>
            </div>

            {/* Mobile menu button */}
            {onToggleSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="lg:hidden"
                aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {sidebarOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}