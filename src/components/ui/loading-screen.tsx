/**
 * Loading Components
 * 
 * Essential loading components for the application:
 * - LoadingSpinner: Enhanced spinner with multiple variants
 * - LoadingOverlay: Overlay loading state for components
 * - LoadingScreen: Full-page loading screen
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner, type SpinnerProps } from './shadcn-io/spinner/index';

/**
 * Enhanced loading spinner component using shadcn Spinner
 */
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
  variant?: SpinnerProps['variant'];
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  variant = 'default',
}) => {
  const getSizeValue = (size: 'sm' | 'md' | 'lg' | number): number => {
    if (typeof size === 'number') return size;
    const sizeMap = { sm: 16, md: 24, lg: 32 };
    return sizeMap[size];
  };

  return (
    <Spinner
      variant={variant}
      size={getSizeValue(size)}
      className={cn('text-gray-500', className)}
    />
  );
};

/**
 * Loading overlay component
 */
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  children,
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced full-page loading screen component
 */
export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center space-y-4 text-center">
        <LoadingSpinner variant="ellipsis" size="lg" />
      </div>
    </div>
  );
};

/**
 * Content area loading screen component
 * Overlays only the main content area, leaving header and sidebar accessible
 */
export const ContentLoadingScreen: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="flex flex-col items-center space-y-4 text-center">
        <LoadingSpinner variant="ellipsis" size="lg" />
      </div>
    </div>
  );
};