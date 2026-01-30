import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { Suspense, useState } from 'react'
import { LeniaSimulation } from './components/LeniaSimulation'
import './App.css'

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
        <p className="hint">Adjust parameters in the panel to explore different species</p>
      </div>
    </div>
  )
}

function App() {
  const [started, setStarted] = useState(false)

  return (
    <div className="app">
      <Leva collapsed={false} oneLineLabels hidden={!started} />
      
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
              <LeniaSimulation />
            </Suspense>
          </Canvas>
          <div className="info">
            <h1>Lenia</h1>
            <p>Continuous Cellular Automata</p>
          </div>
        </>
      )}
    </div>
  )
}

export default App
