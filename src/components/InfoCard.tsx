import { useState, useEffect } from 'react'
import { species, type Species } from '../data/species'

interface InfoCardProps {
  speciesName: string
}

const categoryColors: Record<Species['category'], string> = {
  classic: '#4ecdc4',
  exotic: '#a855f7',
  chaotic: '#f97316',
  inspired: '#3b82f6',
}

const categoryLabels: Record<Species['category'], string> = {
  classic: 'Classic Lenia',
  exotic: 'Exotic Form',
  chaotic: 'Edge of Chaos',
  inspired: 'Science-Inspired',
}

export function InfoCard({ speciesName }: InfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isVisible, setIsVisible] = useState(true)
  const [currentSpecies, setCurrentSpecies] = useState<Species | null>(null)
  
  useEffect(() => {
    const spec = species.find(s => s.name === speciesName)
    if (spec) {
      // Animate out, update, animate in
      setIsVisible(false)
      const timer = setTimeout(() => {
        setCurrentSpecies(spec)
        setIsVisible(true)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [speciesName])
  
  if (!currentSpecies) return null
  
  const categoryColor = categoryColors[currentSpecies.category]
  
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 20,
        width: isExpanded ? 340 : 48,
        background: 'rgba(10, 15, 28, 0.85)',
        backdropFilter: 'blur(12px)',
        borderRadius: 12,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-10px)',
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        zIndex: 100,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: isExpanded ? '14px 16px 10px' : '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            background: `linear-gradient(135deg, ${categoryColor}, ${categoryColor}88)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            flexShrink: 0,
          }}
        >
          {currentSpecies.category === 'classic' && '◉'}
          {currentSpecies.category === 'exotic' && '✦'}
          {currentSpecies.category === 'chaotic' && '⚡'}
          {currentSpecies.category === 'inspired' && '◈'}
        </div>
        
        {isExpanded && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}>
              {currentSpecies.name}
            </div>
            <div style={{
              color: categoryColor,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginTop: 2,
            }}>
              {categoryLabels[currentSpecies.category]}
            </div>
          </div>
        )}
        
        {isExpanded && (
          <div style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: 10,
            transform: 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }}>
            ▼
          </div>
        )}
      </div>
      
      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '12px 16px 16px' }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.75)',
            fontSize: 12,
            lineHeight: 1.65,
            margin: 0,
            letterSpacing: '0.01em',
          }}>
            {currentSpecies.description}
          </p>
          
          {/* Parameters */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <ParamPill label="R" value={currentSpecies.R} />
            <ParamPill label="μ" value={currentSpecies.mu.toFixed(2)} />
            <ParamPill label="σ" value={currentSpecies.sigma.toFixed(3)} />
            {currentSpecies.beta && currentSpecies.beta.length > 1 && (
              <ParamPill label="rings" value={currentSpecies.beta.length} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ParamPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 4,
      padding: '4px 8px',
      fontSize: 10,
      color: 'rgba(255, 255, 255, 0.6)',
    }}>
      <span style={{ color: 'rgba(255, 255, 255, 0.35)' }}>{label}</span>
      <span style={{ marginLeft: 4, color: '#4ecdc4' }}>{value}</span>
    </div>
  )
}
