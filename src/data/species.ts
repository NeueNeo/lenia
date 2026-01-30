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
  },
  
  // SmoothLife-like settings
  {
    name: 'SmoothLife',
    R: 21,
    mu: 0.19,
    sigma: 0.033,
    kernelSigma: 0.15,
    beta: [1, 0],
    pattern: generateRandomBlob(64),
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
  },
  
  // Large, slow waves
  {
    name: 'Oceania',
    R: 25,
    mu: 0.11,
    sigma: 0.012,
    kernelSigma: 0.18,
    beta: [1, 0.7, 0.4],
    pattern: generateRandomBlob(100),
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
  },
]
