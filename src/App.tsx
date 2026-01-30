import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { Suspense } from 'react'
import { LeniaSimulation } from './components/LeniaSimulation'
import './App.css'

function App() {
  return (
    <div className="app">
      <Leva collapsed={false} oneLineLabels />
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
    </div>
  )
}

export default App
