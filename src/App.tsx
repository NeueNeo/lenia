import { Canvas } from '@react-three/fiber'
import { Suspense, useState, useCallback, useRef } from 'react'
import { LeniaSimulation, type LeniaSimulationHandle } from './components/LeniaSimulation'
import { species } from './data/species'
import './App.css'

const colorSchemes = [
  { name: 'Viridis', value: 0 },
  { name: 'Plasma', value: 1 },
  { name: 'Ocean', value: 2 },
  { name: 'Fire', value: 3 },
  { name: 'Bioluminescent', value: 4 },
]

function StartOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div className="start-overlay">
      <div className="start-content">
        <h1>LENIA</h1>
        <p>Continuous Cellular Automata</p>
        <p className="subtitle">Mathematical life forms</p>
        <button onClick={onStart} className="start-button">
          <span className="play-icon">▶</span>
          Start Simulation
        </button>
      </div>
    </div>
  )
}

function App() {
  const [started, setStarted] = useState(false)
  const [currentSpecies, setCurrentSpecies] = useState('Orbium')
  const [colorScheme, setColorScheme] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const simulationRef = useRef<LeniaSimulationHandle>(null)

  const handleSpeciesChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value
    setCurrentSpecies(name)
    simulationRef.current?.loadSpecies(name)
  }, [])

  const handleRespawn = useCallback(() => {
    simulationRef.current?.respawn()
  }, [])

  const handleColorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setColorScheme(Number(e.target.value))
  }, [])

  const handlePauseToggle = useCallback(() => {
    setIsPaused(p => !p)
  }, [])

  const currentSpeciesData = species.find(s => s.name === currentSpecies)

  return (
    <div className="app">
      {!started && <StartOverlay onStart={() => setStarted(true)} />}
      
      {started && (
        <>
          <Canvas
            orthographic
            camera={{ zoom: 1, position: [0, 0, 1] }}
            gl={{
              antialias: false,
              alpha: false,
              preserveDrawingBuffer: true,
            }}
            dpr={1}
          >
            <Suspense fallback={null}>
              <LeniaSimulation 
                ref={simulationRef}
                colorScheme={colorScheme}
                isPaused={isPaused}
              />
            </Suspense>
          </Canvas>

          {/* Control Panel */}
          <div className="control-panel">
            <div className="panel-section">
              <h3>Species</h3>
              <select value={currentSpecies} onChange={handleSpeciesChange}>
                {species.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
              <button onClick={handleRespawn} className="respawn-btn">
                ↻ Respawn
              </button>
            </div>

            <div className="panel-section">
              <h3>Display</h3>
              <select value={colorScheme} onChange={handleColorChange}>
                {colorSchemes.map(c => (
                  <option key={c.value} value={c.value}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="panel-section">
              <button onClick={handlePauseToggle} className="pause-btn">
                {isPaused ? '▶ Play' : '⏸ Pause'}
              </button>
            </div>
          </div>

          {/* Species Info */}
          {currentSpeciesData && (
            <div className="species-info">
              <h2>{currentSpeciesData.name}</h2>
              <p className="category">{currentSpeciesData.category}</p>
              <p className="description">{currentSpeciesData.description}</p>
            </div>
          )}

          <div className="title">
            <span className="title-text">lenia</span>
          </div>
        </>
      )}
    </div>
  )
}

export default App
