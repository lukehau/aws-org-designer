/**
 * Tutorial Hook
 * React hook for managing tutorial state and actions
 */

import { useCallback } from 'react';
import { tutorialService } from '@/services/tutorialService';
import { useStore } from '@/store';

export function useTutorial() {
  const { setTutorialActive } = useStore();

  /**
   * Start the tutorial
   */
  const startTutorial = useCallback(() => {
    setTutorialActive(true);
    tutorialService.start();
  }, [setTutorialActive]);

  return {
    startTutorial,
  };
}
