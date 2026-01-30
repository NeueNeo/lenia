// Lenia species presets
// Based on Bert Chan's research: https://chakazul.github.io/lenia.html

export interface Species {
  name: string
  R: number           // Kernel radius
  mu: number          // Growth center
  sigma: number       // Growth width
  kernelSigma?: number // Kernel peak width
  beta?: number[]     // Ring heights
  pattern?: number[][] // Initial pattern (optional)
  description: string  // Educational description
  category: 'classic' | 'exotic' | 'chaotic' | 'inspired'
}

// Generate a circular/ring pattern
function generateOrbiumPattern(size: number = 64): number[][] {
  const pattern: number[][] = []
  const center = size / 2
  const innerR = size * 0.15
  const outerR = size * 0.35
  
  for (let y = 0; y < size; y++) {
    const row: number[] = []
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < innerR) {
        row.push(0.8 + Math.random() * 0.2)
      } else if (dist < outerR) {
        const t = (dist - innerR) / (outerR - innerR)
        row.push(Math.max(0, 0.9 - t * 0.9 + Math.random() * 0.1))
      } else {
        row.push(0)
      }
    }
    pattern.push(row)
  }
  return pattern
}

function generateGyrorbitumPattern(size: number = 64): number[][] {
  const pattern: number[][] = []
  const center = size / 2
  
  for (let y = 0; y < size; y++) {
    const row: number[] = []
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      
      const r = size * 0.3
      const wave = Math.sin(angle * 4) * 0.15 * r
      const adjustedR = r + wave
      
      if (dist < adjustedR) {
        const val = Math.exp(-dist * dist / (r * r * 0.5))
        row.push(val * 0.9)
      } else {
        row.push(0)
      }
    }
    pattern.push(row)
  }
  return pattern
}

function generateHelixPattern(size: number = 64): number[][] {
  const pattern: number[][] = []
  const center = size / 2
  
  for (let y = 0; y < size; y++) {
    const row: number[] = []
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)
      const angle = Math.atan2(dy, dx)
      
      // Spiral arms
      const spiral = Math.sin(angle * 2 - dist * 0.2)
      const r = size * 0.35
      
      if (dist < r && spiral > 0.3) {
        const val = Math.exp(-dist * dist / (r * r * 0.6)) * spiral
        row.push(Math.min(1, val * 1.2))
      } else {
        row.push(0)
      }
    }
    pattern.push(row)
  }
  return pattern
}

function generateScutiumPattern(size: number = 64): number[][] {
  const pattern: number[][] = []
  const center = size / 2
  
  for (let y = 0; y < size; y++) {
    const row: number[] = []
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      
      // Shield shape - elongated with rounded edges
      const elongation = 0.7
      const adjustedDist = Math.sqrt((dx * elongation) ** 2 + dy ** 2)
      const r = size * 0.3
      
      if (adjustedDist < r) {
        const val = Math.exp(-adjustedDist * adjustedDist / (r * r * 0.4))
        row.push(val * 0.85)
      } else {
        row.push(0)
      }
    }
    pattern.push(row)
  }
  return pattern
}

function generateRandomBlob(size: number = 64): number[][] {
  const pattern: number[][] = []
  const center = size / 2
  const r = size * 0.4
  
  for (let y = 0; y < size; y++) {
    const row: number[] = []
    for (let x = 0; x < size; x++) {
      const dx = x - center
      const dy = y - center
      const dist = Math.sqrt(dx * dx + dy * dy)
      
      if (dist < r) {
        row.push(Math.random() * 0.6 + 0.2)
      } else {
        row.push(0)
      }
    }
    pattern.push(row)
  }
  return pattern
}

export const species: Species[] = [
  // Classic Orbium - the most well-known Lenia creature
  {
    name: 'Orbium',
    R: 13,
    mu: 0.15,
    sigma: 0.015,
    kernelSigma: 0.15,
    beta: [1],
    pattern: generateOrbiumPattern(64),
    category: 'classic',
    description: `The Orbium is Lenia's most iconic lifeform — a self-organizing pattern that maintains its structure while gliding across the field. Discovered by Bert Chan in 2018, it demonstrates how continuous cellular automata can produce stable, mobile entities from simple mathematical rules. The name derives from Latin "orbis" (circle), reflecting its rounded form.`,
  },
  
  // Orbium with double ring kernel
  {
    name: 'Orbium bicaudatus',
    R: 13,
    mu: 0.156,
    sigma: 0.016,
    kernelSigma: 0.15,
    beta: [1, 0.5],
    pattern: generateOrbiumPattern(64),
    category: 'classic',
    description: `A variant of the classic Orbium using a two-ring kernel, creating more complex internal dynamics. The dual-ring structure (beta weights [1, 0.5]) causes the creature to develop tail-like appendages or split into multiple lobes. This demonstrates how kernel complexity directly shapes morphology — similar to how different gene regulatory networks produce varied body plans in biology.`,
  },
  
  // Gyrorbitum - rotating pattern
  {
    name: 'Gyrorbium',
    R: 13,
    mu: 0.14,
    sigma: 0.014,
    kernelSigma: 0.15,
    beta: [1],
    pattern: generateGyrorbitumPattern(64),
    category: 'classic',
    description: `The Gyrorbium exhibits rotational motion while maintaining its overall structure — a behavior reminiscent of biological organisms like rotifers. Its slightly lower growth parameters (μ=0.14) create asymmetric density distributions that generate torque. This emergence of rotation from isotropic rules mirrors how chirality appears in nature from symmetric physical laws.`,
  },
  
  // Scutium - shield-like
  {
    name: 'Scutium',
    R: 13,
    mu: 0.21,
    sigma: 0.022,
    kernelSigma: 0.15,
    beta: [1],
    pattern: generateScutiumPattern(64),
    category: 'classic',
    description: `Named for the Latin word for "shield," the Scutium forms elongated, defensive-looking structures. Its higher growth center (μ=0.21) favors denser configurations, producing compact forms that resist perturbation. In dynamical systems terms, these represent deeper attractors — states the system strongly prefers and returns to after disruption.`,
  },
  
  // Helix - spiral patterns
  {
    name: 'Helix',
    R: 15,
    mu: 0.18,
    sigma: 0.02,
    kernelSigma: 0.12,
    beta: [1, 0.6, 0.3],
    pattern: generateHelixPattern(64),
    category: 'exotic',
    description: `The Helix preset uses a three-ring kernel to generate spiral and vortex patterns. These structures echo reaction-diffusion systems like the Belousov-Zhabotinsky chemical reaction, which produces similar rotating spirals. The multiple kernel rings create competing wavefronts that twist around each other — a beautiful example of pattern formation through interference.`,
  },
  
  // Hydrogeminium - multi-lobed
  {
    name: 'Hydrogeminium',
    R: 10,
    mu: 0.27,
    sigma: 0.025,
    kernelSigma: 0.18,
    beta: [1, 0.4],
    pattern: generateRandomBlob(64),
    category: 'exotic',
    description: `Hydrogeminium produces gem-like, multi-lobed structures with high internal activity. The elevated growth center (μ=0.27) and wider sigma create conditions favoring dense, crystalline formations. The name combines "hydro" (water) and "geminium" (gem), evoking the appearance of precious stones suspended in fluid.`,
  },
  
  // Pentafolium - five-lobed flower
  {
    name: 'Pentafolium',
    R: 12,
    mu: 0.19,
    sigma: 0.019,
    kernelSigma: 0.14,
    beta: [1, 0.3, 0.1],
    pattern: generateRandomBlob(64),
    category: 'exotic',
    description: `Pentafolium tends to form flower-like patterns with multiple lobes. Its three-ring kernel with decreasing weights [1, 0.3, 0.1] creates subtle interference patterns that encourage radial symmetry — similar to how phyllotaxis (leaf arrangement) in plants emerges from simple growth rules. The structures often pulse rhythmically, like breathing flowers.`,
  },
  
  // Paramecium-like
  {
    name: 'Paramecia',
    R: 18,
    mu: 0.12,
    sigma: 0.014,
    kernelSigma: 0.15,
    beta: [1],
    pattern: generateScutiumPattern(64),
    category: 'inspired',
    description: `Inspired by the single-celled Paramecium, this preset uses a larger kernel radius (R=18) to create elongated, ciliate-like forms. The low growth center (μ=0.12) produces diffuse boundaries resembling the fuzzy cilia that real paramecia use for locomotion. These digital creatures often exhibit similar gliding and tumbling behaviors.`,
  },
  
  // SmoothLife-like settings
  {
    name: 'SmoothLife',
    R: 20,
    mu: 0.19,
    sigma: 0.033,
    kernelSigma: 0.15,
    beta: [1, 0],
    pattern: generateRandomBlob(64),
    category: 'inspired',
    description: `Based on Stephan Rafler's SmoothLife (2011), which first generalized Conway's Game of Life to continuous space. This preset recreates similar dynamics with a large kernel radius and specific growth function. SmoothLife proved that discrete cellular automata rules could be "smoothed" while preserving complex behavior — a key insight that led to Lenia's development.`,
  },
  
  // High activity chaotic
  {
    name: 'Primordial Soup',
    R: 10,
    mu: 0.35,
    sigma: 0.07,
    kernelSigma: 0.2,
    beta: [1, 0.5, 0.25],
    pattern: generateRandomBlob(80),
    category: 'chaotic',
    description: `Primordial Soup operates at the edge of chaos — high growth center (μ=0.35) and wide sigma create volatile, ever-changing patterns. This regime models prebiotic chemistry where complex molecules formed and dissolved in ancient oceans. Watch for brief moments of organization emerging from the turbulence: transient structures that hint at how order might arise from chaos.`,
  },
  
  // Tight, small creatures
  {
    name: 'Microbia',
    R: 7,
    mu: 0.22,
    sigma: 0.018,
    kernelSigma: 0.12,
    beta: [1],
    pattern: generateOrbiumPattern(40),
    category: 'exotic',
    description: `Microbia uses a small kernel radius (R=7) to produce tiny, tightly-packed organisms. At this scale, many independent creatures can coexist and interact in the same field. The dynamics resemble bacterial colonies or plankton populations, where individuals bump, merge, and separate. Higher density and narrower sigma keep structures compact.`,
  },
  
  // Large, slow waves
  {
    name: 'Oceania',
    R: 20,
    mu: 0.11,
    sigma: 0.012,
    kernelSigma: 0.18,
    beta: [1, 0.7, 0.4],
    pattern: generateRandomBlob(100),
    category: 'exotic',
    description: `Oceania operates at large scale with R=20, producing vast, slow-moving wave patterns reminiscent of ocean currents or atmospheric systems. The three-ring kernel creates layered interference patterns. The low growth center (μ=0.11) means structures need broad support to survive — isolated peaks quickly dissolve back into the field.`,
  },
  
  // Custom: optimized for visual appeal
  {
    name: 'Luminara',
    R: 14,
    mu: 0.17,
    sigma: 0.018,
    kernelSigma: 0.14,
    beta: [1, 0.3],
    pattern: generateOrbiumPattern(64),
    category: 'exotic',
    description: `Luminara is tuned for visual appeal, producing glowing, bioluminescent-looking patterns. The dual-ring kernel creates internal texture while balanced parameters maintain stable structures. Pair with the Bioluminescent color scheme to see patterns that evoke deep-sea creatures — those mysterious organisms that create their own light in the abyssal darkness.`,
  },
]
