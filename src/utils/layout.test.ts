import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getLayoutedElements, type LayoutOptions } from './layout'
import type { Node, Edge } from '@xyflow/react'

// Helper to create a minimal node for testing
const createNode = (id: string, position = { x: 0, y: 0 }): Node => ({
  id,
  position,
  data: { label: id },
  type: 'default',
})

// Helper to create an edge
const createEdge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
})

describe('getLayoutedElements', () => {
  describe('positions nodes correctly', () => {
    it('positions a single node', () => {
      const nodes = [createNode('root')]
      const edges: Edge[] = []

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].position).toBeDefined()
      expect(typeof result.nodes[0].position.x).toBe('number')
      expect(typeof result.nodes[0].position.y).toBe('number')
    })

    it('positions multiple nodes with edges', () => {
      const nodes = [
        createNode('root'),
        createNode('child1'),
        createNode('child2'),
      ]
      const edges = [
        createEdge('root', 'child1'),
        createEdge('root', 'child2'),
      ]

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes).toHaveLength(3)
      result.nodes.forEach(node => {
        expect(node.position).toBeDefined()
        expect(typeof node.position.x).toBe('number')
        expect(typeof node.position.y).toBe('number')
      })
    })

    it('preserves node data after layout', () => {
      const nodes = [
        { ...createNode('root'), data: { label: 'Root', customProp: 'test' } },
      ]
      const edges: Edge[] = []

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes[0].data).toEqual({ label: 'Root', customProp: 'test' })
    })

    it('preserves edges unchanged', () => {
      const nodes = [createNode('root'), createNode('child')]
      const edges = [createEdge('root', 'child')]

      const result = getLayoutedElements(nodes, edges)

      expect(result.edges).toEqual(edges)
    })
  })

  describe('respects direction option', () => {
    it('positions children below parent in TB (top-to-bottom) direction', () => {
      const nodes = [createNode('parent'), createNode('child')]
      const edges = [createEdge('parent', 'child')]

      const result = getLayoutedElements(nodes, edges, { direction: 'TB' })

      const parentNode = result.nodes.find(n => n.id === 'parent')!
      const childNode = result.nodes.find(n => n.id === 'child')!

      expect(childNode.position.y).toBeGreaterThan(parentNode.position.y)
    })

    it('positions children above parent in BT (bottom-to-top) direction', () => {
      const nodes = [createNode('parent'), createNode('child')]
      const edges = [createEdge('parent', 'child')]

      const result = getLayoutedElements(nodes, edges, { direction: 'BT' })

      const parentNode = result.nodes.find(n => n.id === 'parent')!
      const childNode = result.nodes.find(n => n.id === 'child')!

      expect(childNode.position.y).toBeLessThan(parentNode.position.y)
    })

    it('positions children to the right of parent in LR (left-to-right) direction', () => {
      const nodes = [createNode('parent'), createNode('child')]
      const edges = [createEdge('parent', 'child')]

      const result = getLayoutedElements(nodes, edges, { direction: 'LR' })

      const parentNode = result.nodes.find(n => n.id === 'parent')!
      const childNode = result.nodes.find(n => n.id === 'child')!

      expect(childNode.position.x).toBeGreaterThan(parentNode.position.x)
    })

    it('positions children to the left of parent in RL (right-to-left) direction', () => {
      const nodes = [createNode('parent'), createNode('child')]
      const edges = [createEdge('parent', 'child')]

      const result = getLayoutedElements(nodes, edges, { direction: 'RL' })

      const parentNode = result.nodes.find(n => n.id === 'parent')!
      const childNode = result.nodes.find(n => n.id === 'child')!

      expect(childNode.position.x).toBeLessThan(parentNode.position.x)
    })
  })

  describe('handles empty node/edge arrays', () => {
    it('handles empty nodes array', () => {
      const nodes: Node[] = []
      const edges: Edge[] = []

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes).toEqual([])
      expect(result.edges).toEqual([])
    })

    it('handles nodes with no edges', () => {
      const nodes = [createNode('node1'), createNode('node2'), createNode('node3')]
      const edges: Edge[] = []

      const result = getLayoutedElements(nodes, edges)

      expect(result.nodes).toHaveLength(3)
      result.nodes.forEach(node => {
        expect(node.position).toBeDefined()
      })
    })
  })

  describe('parent nodes positioned above children (TB direction)', () => {
    it('positions root above all descendants in a tree', () => {
      const nodes = [
        createNode('root'),
        createNode('child1'),
        createNode('child2'),
        createNode('grandchild1'),
      ]
      const edges = [
        createEdge('root', 'child1'),
        createEdge('root', 'child2'),
        createEdge('child1', 'grandchild1'),
      ]

      const result = getLayoutedElements(nodes, edges, { direction: 'TB' })

      const rootNode = result.nodes.find(n => n.id === 'root')!
      const child1Node = result.nodes.find(n => n.id === 'child1')!
      const child2Node = result.nodes.find(n => n.id === 'child2')!
      const grandchildNode = result.nodes.find(n => n.id === 'grandchild1')!

      // Root should be above children
      expect(rootNode.position.y).toBeLessThan(child1Node.position.y)
      expect(rootNode.position.y).toBeLessThan(child2Node.position.y)

      // Children should be above grandchildren
      expect(child1Node.position.y).toBeLessThan(grandchildNode.position.y)
    })

    it('positions siblings at the same level', () => {
      const nodes = [
        createNode('root'),
        createNode('child1'),
        createNode('child2'),
        createNode('child3'),
      ]
      const edges = [
        createEdge('root', 'child1'),
        createEdge('root', 'child2'),
        createEdge('root', 'child3'),
      ]

      const result = getLayoutedElements(nodes, edges, { direction: 'TB' })

      const child1Node = result.nodes.find(n => n.id === 'child1')!
      const child2Node = result.nodes.find(n => n.id === 'child2')!
      const child3Node = result.nodes.find(n => n.id === 'child3')!

      // All children should be at approximately the same Y position
      expect(child1Node.position.y).toBeCloseTo(child2Node.position.y, 0)
      expect(child2Node.position.y).toBeCloseTo(child3Node.position.y, 0)
    })
  })

  describe('custom layout options', () => {
    it('respects custom nodeWidth and nodeHeight', () => {
      const nodes = [createNode('root'), createNode('child')]
      const edges = [createEdge('root', 'child')]
      const options: Partial<LayoutOptions> = {
        nodeWidth: 400,
        nodeHeight: 200,
      }

      const result = getLayoutedElements(nodes, edges, options)

      // Layout should complete without errors
      expect(result.nodes).toHaveLength(2)
    })

    it('respects custom rankSep and nodeSep', () => {
      const nodes = [
        createNode('root'),
        createNode('child1'),
        createNode('child2'),
      ]
      const edges = [
        createEdge('root', 'child1'),
        createEdge('root', 'child2'),
      ]
      const options: Partial<LayoutOptions> = {
        rankSep: 100,
        nodeSep: 50,
      }

      const result = getLayoutedElements(nodes, edges, options)

      // Layout should complete without errors
      expect(result.nodes).toHaveLength(3)
    })
  })
})

describe('getLayoutedElements property-based tests', () => {
  // Default layout options for testing
  const defaultNodeWidth = 280
  const defaultNodeHeight = 140

  // Arbitrary for generating node IDs
  const nodeIdArb = fc.stringMatching(/^[a-z][a-z0-9]{0,9}$/)

  // Arbitrary for generating a tree structure (nodes and edges)
  const treeArb = fc.integer({ min: 1, max: 10 }).chain((nodeCount: number) => {
    // Generate unique node IDs
    return fc.uniqueArray(nodeIdArb, { minLength: nodeCount, maxLength: nodeCount }).map((ids: string[]) => {
      const nodes: Node[] = ids.map((id: string) => createNode(id))
      const edges: Edge[] = []

      // Create a tree structure: each node (except root) has exactly one parent
      for (let i = 1; i < ids.length; i++) {
        // Pick a random parent from nodes that come before this one
        const parentIndex = Math.floor(Math.random() * i)
        edges.push(createEdge(ids[parentIndex], ids[i]))
      }

      return { nodes, edges }
    })
  })

  // Helper to check if two nodes overlap
  const nodesOverlap = (
    node1: Node,
    node2: Node,
    nodeWidth: number,
    nodeHeight: number
  ): boolean => {
    const horizontalOverlap =
      node1.position.x < node2.position.x + nodeWidth &&
      node1.position.x + nodeWidth > node2.position.x

    const verticalOverlap =
      node1.position.y < node2.position.y + nodeHeight &&
      node1.position.y + nodeHeight > node2.position.y

    return horizontalOverlap && verticalOverlap
  }

  /**
   * Property 7: Layout Produces Non-Overlapping Positions
   * For any set of nodes and edges, getLayoutedElements SHALL produce
   * node positions where no two nodes overlap (respecting minimum spacing).
   * **Validates: Requirements 7.1, 7.3**
   */
  it('produces non-overlapping positions for any tree structure', () => {
    fc.assert(
      fc.property(treeArb, ({ nodes, edges }: { nodes: Node[], edges: Edge[] }) => {
        const result = getLayoutedElements(nodes, edges)

        // Check that no two nodes overlap
        for (let i = 0; i < result.nodes.length; i++) {
          for (let j = i + 1; j < result.nodes.length; j++) {
            const overlap = nodesOverlap(
              result.nodes[i],
              result.nodes[j],
              defaultNodeWidth,
              defaultNodeHeight
            )
            if (overlap) {
              return false
            }
          }
        }
        return true
      }),
      { numRuns: 100 }
    )
  })
})
