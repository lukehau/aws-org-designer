import * as React from "react"
import { XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PolicyBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  type: 'scp' | 'rcp'
  children: React.ReactNode
  onRemove?: () => void
  removable?: boolean
  onClick?: () => void
  clickable?: boolean
}

/**
 * PolicyBadge component for displaying SCP and RCP policy names
 * Used in the organization tree inheritance trail visualization
 */
function PolicyBadge({ type, children, className, onRemove, removable = false, onClick, clickable = false, ...props }: PolicyBadgeProps) {
  const variants = {
    rcp: {
      backgroundColor: '#f3e8ff',
      borderColor: '#d8b4fe',
      color: '#7c3aed',
    },
    scp: {
      backgroundColor: '#fef3c7',
      borderColor: '#fde047',
      color: '#a16207',
    },
  }

  const hoverStyles = {
    rcp: {
      backgroundColor: '#e9d5ff',
      borderColor: '#c084fc',
    },
    scp: {
      backgroundColor: '#fde68a',
      borderColor: '#facc15',
    },
  }

  const [isHovered, setIsHovered] = React.useState(false)

  const currentStyle = isHovered ? { ...variants[type], ...hoverStyles[type] } : variants[type]

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    onClick?.();
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap",
        clickable && "cursor-pointer hover:shadow-sm",
        className
      )}
      style={currentStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={clickable ? handleClick : undefined}
      {...props}
    >
      {children}
      {removable && onRemove && (
        <XCircle
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onRemove();
            }
          }}
          aria-label={`Remove ${children} from selection`}
          className="ml-2 h-3 w-3 cursor-pointer hover:bg-white/20 rounded-sm p-0.5 focus:outline-none focus:ring-1 focus:ring-white/50 flex-shrink-0"
        />
      )}
    </div>
  )
}

export { PolicyBadge }