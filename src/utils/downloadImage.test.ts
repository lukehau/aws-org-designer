/**
 * Tests for downloadImage utility
 * 
 * Tests cover:
 * - downloadImage: Image generation and download functionality
 * - generateImageFilename: Filename sanitization and formatting
 * - Property-based tests for filename sanitization robustness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactFlowInstance, Node } from '@xyflow/react';
import fc from 'fast-check';
import { downloadImage, generateImageFilename } from './downloadImage';

// Mock ESM modules at the top level (required for ESM compatibility)
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mockImageData'),
}));

vi.mock('@xyflow/react', () => ({
  getNodesBounds: vi.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 500,
    height: 300,
  }),
}));

// Import mocked modules after vi.mock declarations
import { toPng } from 'html-to-image';
import { getNodesBounds } from '@xyflow/react';

// Helper to create mock ReactFlow instance
const createMockReactFlowInstance = (nodes: Node[] = []): ReactFlowInstance => ({
  getNodes: vi.fn(() => nodes),
  getViewport: vi.fn(() => ({ x: 0, y: 0, zoom: 1 })),
} as unknown as ReactFlowInstance);

describe('downloadImage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,mockImageData');
    vi.mocked(getNodesBounds).mockReturnValue({
      x: 0,
      y: 0,
      width: 500,
      height: 300,
    });

    // Set up DOM with viewport and buttons
    document.body.innerHTML = `
      <div class="react-flow__viewport">
        <button>Add Node</button>
        <button>Delete</button>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('generates image and triggers download with valid ReactFlow instance', async () => {
    const mockInstance = createMockReactFlowInstance([]);
    const clickSpy = vi.fn();
    
    // Mock createElement to capture the link click
    const originalCreateElement = document.createElement.bind(document);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        (element as HTMLAnchorElement).click = clickSpy;
      }
      return element;
    }) as typeof document.createElement);

    await downloadImage(mockInstance, 'test-image.png');

    expect(toPng).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('throws error when viewport element not found', async () => {
    document.body.innerHTML = ''; // Remove viewport
    const mockInstance = createMockReactFlowInstance([]);

    await expect(downloadImage(mockInstance)).rejects.toThrow('ReactFlow viewport not found');
  });

  it('hides buttons during image capture', async () => {
    const mockInstance = createMockReactFlowInstance([]);
    const buttons = document.querySelectorAll('button');
    
    // Track button display values during toPng call
    let buttonsHiddenDuringCapture = false;
    vi.mocked(toPng).mockImplementation(async () => {
      // Check if buttons are hidden when toPng is called
      buttonsHiddenDuringCapture = Array.from(buttons).every(
        (btn) => btn.style.display === 'none'
      );
      return 'data:image/png;base64,mockImageData';
    });

    await downloadImage(mockInstance);

    expect(buttonsHiddenDuringCapture).toBe(true);
  });

  it('restores button visibility after successful completion', async () => {
    const mockInstance = createMockReactFlowInstance([]);
    const buttons = document.querySelectorAll('button');
    
    // Set initial display values
    buttons.forEach((btn) => {
      (btn as HTMLElement).style.display = 'inline-block';
    });

    await downloadImage(mockInstance);

    // Buttons should be restored to original display value
    buttons.forEach((btn) => {
      expect((btn as HTMLElement).style.display).toBe('inline-block');
    });
  });

  it('restores button visibility after failure', async () => {
    const mockInstance = createMockReactFlowInstance([]);
    const buttons = document.querySelectorAll('button');
    
    // Set initial display values
    buttons.forEach((btn) => {
      (btn as HTMLElement).style.display = 'inline-block';
    });

    // Make toPng fail
    vi.mocked(toPng).mockRejectedValue(new Error('Image generation failed'));

    await expect(downloadImage(mockInstance)).rejects.toThrow('Image generation failed');

    // Buttons should be restored even after failure
    buttons.forEach((btn) => {
      expect((btn as HTMLElement).style.display).toBe('');
    });
  });
});

describe('generateImageFilename', () => {
  it('sanitizes organization name with spaces', () => {
    const result = generateImageFilename('My Test Organization');
    expect(result).toMatch(/^my-test-organization-\d{4}-\d{2}-\d{2}\.png$/);
  });

  it('sanitizes organization name with special characters', () => {
    const result = generateImageFilename('Test@Org#123!');
    expect(result).toMatch(/^test-org-123-\d{4}-\d{2}-\d{2}\.png$/);
  });

  it('sanitizes organization name with unicode characters', () => {
    const result = generateImageFilename('Tëst Örg 日本語');
    expect(result).toMatch(/^t-st-rg-\d{4}-\d{2}-\d{2}\.png$/);
  });

  it('includes date in YYYY-MM-DD format', () => {
    const result = generateImageFilename('Test Org');
    const dateMatch = result.match(/(\d{4}-\d{2}-\d{2})/);
    expect(dateMatch).not.toBeNull();
    
    // Verify it's a valid date
    const date = new Date(dateMatch![1]);
    expect(date.toString()).not.toBe('Invalid Date');
  });

  it('produces output in correct format: {sanitized-name}-{date}.png', () => {
    const result = generateImageFilename('My Organization');
    expect(result).toMatch(/^[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.png$/);
  });

  it('handles empty string input', () => {
    const result = generateImageFilename('');
    expect(result).toMatch(/^-?\d{4}-\d{2}-\d{2}\.png$/);
  });

  it('removes leading and trailing hyphens from sanitized name', () => {
    const result = generateImageFilename('---Test---');
    expect(result).toMatch(/^test-\d{4}-\d{2}-\d{2}\.png$/);
  });
});

describe('generateImageFilename property-based tests', () => {
  /**
   * Property 1: Filename Sanitization Produces Safe Output
   * **Feature: test-coverage-improvements, Property 1**
   * 
   * For any organization name string, the output should:
   * - Contain only lowercase letters (a-z), numbers (0-9), hyphens (-), and dots (.)
   * - Have no leading hyphens in the name portion
   * - Have no trailing hyphens in the name portion
   * - Have no consecutive hyphens
   * - Include a date suffix in YYYY-MM-DD format
   */
  it('produces safe filenames for any organization name', () => {
    fc.assert(
      fc.property(fc.string(), (orgName) => {
        const result = generateImageFilename(orgName);
        
        // Extract the name portion (before the date)
        const namePortion = result.replace(/-\d{4}-\d{2}-\d{2}\.png$/, '');
        
        // Verify output contains only safe characters (lowercase letters, numbers, hyphens, dots)
        expect(result).toMatch(/^[a-z0-9.-]*-?\d{4}-\d{2}-\d{2}\.png$/);
        
        // Verify no leading hyphens in name portion (if name portion exists)
        if (namePortion.length > 0) {
          expect(namePortion).not.toMatch(/^-/);
        }
        
        // Verify no trailing hyphens in name portion (if name portion exists)
        if (namePortion.length > 0) {
          expect(namePortion).not.toMatch(/-$/);
        }
        
        // Verify no consecutive hyphens in name portion
        expect(namePortion).not.toMatch(/--/);
        
        // Verify date suffix is present in YYYY-MM-DD format
        expect(result).toMatch(/-\d{4}-\d{2}-\d{2}\.png$/);
        
        // Verify the date is valid
        const dateMatch = result.match(/(\d{4}-\d{2}-\d{2})\.png$/);
        expect(dateMatch).not.toBeNull();
        const date = new Date(dateMatch![1]);
        expect(date.toString()).not.toBe('Invalid Date');
      }),
      { numRuns: 100 }
    );
  });
});
