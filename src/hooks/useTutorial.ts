/**
 * Tutorial Hook
 * React hook for managing tutorial state and actions
 */

import { useCallback } from 'react';
import { tutorialService, type PopoverConfig } from '@/services/tutorialService';
import { useAppStore } from '@/store';

export function useTutorial() {
  const { setTutorialActive } = useAppStore();

  /**
   * Start the tutorial
   */
  const startTutorial = useCallback(() => {
    setTutorialActive(true);
    tutorialService.start();
  }, [setTutorialActive]);

  /**
   * Stop/skip the tutorial
   */
  const stopTutorial = useCallback(() => {
    tutorialService.stop();
    setTutorialActive(false);
  }, [setTutorialActive]);

  /**
   * Check if tutorial is active
   */
  const isTutorialActive = useCallback(() => {
    return tutorialService.isActive();
  }, []);

  /**
   * Highlight a specific element (for contextual help)
   */
  const highlightElement = useCallback((element: string | Element, popover?: PopoverConfig) => {
    tutorialService.highlight(element, popover);
  }, []);

  return {
    startTutorial,
    stopTutorial,
    isTutorialActive,
    highlightElement,
  };
}
