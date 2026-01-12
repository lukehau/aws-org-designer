/**
 * Tutorial Service
 * Wrapper around Driver.js for managing the application tutorial
 */

import { driver } from 'driver.js';
import type { Driver, Config } from 'driver.js';
import { driverConfig } from '@/config/tutorialConfig';

/**
 * Tutorial Service Class
 * Manages the tutorial lifecycle and state
 */
export class TutorialService {
  private driverObj: Driver | null = null;
  private config: Config;

  constructor(config?: Partial<Config>) {
    this.config = {
      ...driverConfig,
      ...config,
    };
  }

  /**
   * Initialize the driver instance
   */
  private initDriver(): Driver {
    if (!this.driverObj) {
      this.driverObj = driver(this.config);
    }
    return this.driverObj;
  }

  /**
   * Start the tutorial
   */
  start(): void {
    const driverInstance = this.initDriver();
    driverInstance.drive();
  }

  /**
   * Stop/destroy the tutorial
   */
  stop(): void {
    if (this.driverObj) {
      this.driverObj.destroy();
      this.driverObj = null;
    }
  }

  /**
   * Move to next step
   */
  moveNext(): void {
    if (this.driverObj) {
      this.driverObj.moveNext();
    }
  }

  /**
   * Move to previous step
   */
  movePrevious(): void {
    if (this.driverObj) {
      this.driverObj.movePrevious();
    }
  }

  /**
   * Move to a specific step by index
   */
  moveTo(index: number): void {
    if (this.driverObj) {
      this.driverObj.moveTo(index);
    }
  }

  /**
   * Check if tutorial is active
   */
  isActive(): boolean {
    return this.driverObj !== null && this.driverObj.isActive();
  }

  /**
   * Get current step index
   */
  getActiveIndex(): number | undefined {
    if (this.driverObj) {
      return this.driverObj.getActiveIndex();
    }
    return undefined;
  }

  /**
   * Highlight a single element (useful for contextual help)
   */
  highlight(element: string | Element, popover?: any): void {
    const driverInstance = this.initDriver();
    driverInstance.highlight({
      element,
      popover,
    });
  }
}

/**
 * Singleton instance of the tutorial service
 */
export const tutorialService = new TutorialService();
