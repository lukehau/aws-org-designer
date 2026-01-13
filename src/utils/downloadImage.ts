/**
 * Utility for downloading ReactFlow canvas as an image
 */

import { toPng } from 'html-to-image';
import { getNodesBounds } from '@xyflow/react';
import type { ReactFlowInstance } from '@xyflow/react';

// Minimum zoom level to ensure nodes are human-readable
// 1 = actual size, 1.5 = 150%, 2 = 200%, etc.
const MIN_READABLE_ZOOM = 1;
// Padding around nodes in the exported image (in pixels)
const IMAGE_PADDING = 50;

/**
 * Downloads the ReactFlow canvas as a PNG image
 * Nodes are captured at a human-readable zoom level (minimum zoom = 1)
 * Image dimensions are calculated to fit all nodes at this readable zoom
 * @param reactFlowInstance - The ReactFlow instance from useReactFlow hook
 * @param filename - Optional filename (defaults to 'organization-diagram.png')
 */
export async function downloadImage(
  reactFlowInstance: ReactFlowInstance,
  filename: string = 'organization-diagram.png'
): Promise<void> {
  // Get the ReactFlow viewport element
  const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
  
  if (!viewportElement) {
    throw new Error('ReactFlow viewport not found');
  }

  try {
    // Hide interactive elements before capturing
    // Find all buttons within the viewport (Add Node, Delete buttons)
    const buttons = viewportElement.querySelectorAll('button');
    const originalDisplayValues = new Map<Element, string>();
    
    buttons.forEach((button) => {
      originalDisplayValues.set(button, button.style.display);
      button.style.display = 'none';
    });

    // Get all nodes and calculate their bounding box
    const nodes = reactFlowInstance.getNodes();
    const nodesBounds = getNodesBounds(nodes);
    
    // Use a readable zoom level (1 = actual size, nodes are clearly readable)
    const zoom = MIN_READABLE_ZOOM;
    
    // Calculate image dimensions based on nodes bounds at the readable zoom level
    const imageWidth = nodesBounds.width * zoom + IMAGE_PADDING * 2;
    const imageHeight = nodesBounds.height * zoom + IMAGE_PADDING * 2;
    
    // Calculate the transform to position all nodes correctly in the image
    // We need to translate to account for the node bounds position and padding
    const translateX = -nodesBounds.x * zoom + IMAGE_PADDING;
    const translateY = -nodesBounds.y * zoom + IMAGE_PADDING;

    // Generate PNG from the viewport with calculated transform
    const dataUrl = await toPng(viewportElement, {
      backgroundColor: 'transparent',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${translateX}px, ${translateY}px) scale(${zoom})`,
      },
    });

    // Restore button visibility
    buttons.forEach((button) => {
      const originalDisplay = originalDisplayValues.get(button);
      if (originalDisplay !== undefined) {
        button.style.display = originalDisplay;
      }
    });

    // Create download link and trigger download
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    // Make sure to restore buttons even if there's an error
    const buttons = viewportElement.querySelectorAll('button');
    buttons.forEach((button) => {
      button.style.display = '';
    });
    
    console.error('Failed to download image:', error);
    throw error;
  }
}

/**
 * Generates a filename for the organization diagram
 * @param organizationName - Name of the organization
 * @returns Formatted filename with timestamp
 */
export function generateImageFilename(organizationName: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const sanitizedName = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  return `${sanitizedName}-${timestamp}.png`;
}
