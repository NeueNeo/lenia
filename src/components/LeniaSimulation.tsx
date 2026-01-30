import { useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree, extend } from '@react-three/fiber'
import { useControls, button, folder } from 'leva'
import * as THREE from 'three'
import { species } from '../data/species'
import type { Species } from '../data/species'

// Vertex shader - simple fullscreen quad
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Lenia compute shader - the core simulation
const computeShader = `
  precision highp float;
  
  uniform sampler2D uState;
  uniform vec2 uResolution;
  uniform float uDt;
  uniform float uR;      // kernel radius in cells
  uniform float uMu;     // growth center
  uniform float uSigma;  // growth width
  uniform float uKernelMu;    // kernel peak position (0-1)
  uniform float uKernelSigma; // kernel peak width
  uniform vec4 uBeta;   // ring heights (up to 4 rings)
  uniform int uRingCount;
  
  varying vec2 vUv;
  
  // Gaussian bell curve
  float bell(float x, float mu, float sigma) {
    float d = (x - mu) / sigma;
    return exp(-d * d / 2.0);
  }
  
  // Kernel function - concentric rings
  float kernel(float r) {
    // r is normalized distance (0 at center, 1 at edge)
    if (r >= 1.0) return 0.0;
    
    float sum = 0.0;
    for (int i = 0; i < 4; i++) {
      if (i >= uRingCount) break;
      float ringCenter = (float(i) + 0.5) / float(uRingCount);
      float ringValue = bell(r, ringCenter, uKernelSigma);
      sum += uBeta[i] * ringValue;
    }
    return sum;
  }
  
  // Growth function
  float growth(float u) {
    return 2.0 * bell(u, uMu, uSigma) - 1.0;
  }
  
  void main() {
    vec2 pixel = 1.0 / uResolution;
    
    // Compute convolution with kernel
    float kernelSum = 0.0;
    float valueSum = 0.0;
    
    int radius = int(uR);
    
    for (int dy = -50; dy <= 50; dy++) {
      if (abs(dy) > radius) continue;
      for (int dx = -50; dx <= 50; dx++) {
        if (abs(dx) > radius) continue;
        
        float dist = length(vec2(float(dx), float(dy)));
        if (dist > uR) continue;
        
        float r = dist / uR;  // normalized distance
        float k = kernel(r);
        
        vec2 sampleUv = vUv + vec2(float(dx), float(dy)) * pixel;
        // Wrap around (toroidal boundary)
        sampleUv = fract(sampleUv);
        
        float state = texture2D(uState, sampleUv).r;
        valueSum += state * k;
        kernelSum += k;
      }
    }
    
    // Normalize by kernel sum
    float u = kernelSum > 0.0 ? valueSum / kernelSum : 0.0;
    
    // Apply growth function and update
    float current = texture2D(uState, vUv).r;
    float g = growth(u);
    float newState = current + uDt * g;
    
    // Clamp to [0, 1]
    newState = clamp(newState, 0.0, 1.0);
    
    gl_FragColor = vec4(newState, u, g * 0.5 + 0.5, 1.0);
  }
`

// Render shader - beautiful color mapping
const renderShader = `
  precision highp float;
  
  uniform sampler2D uState;
  uniform int uColorScheme;
  uniform float uTime;
  
  varying vec2 vUv;
  
  // Color schemes
  vec3 viridis(float t) {
    const vec3 c0 = vec3(0.267, 0.004, 0.329);
    const vec3 c1 = vec3(0.282, 0.140, 0.457);
    const vec3 c2 = vec3(0.254, 0.265, 0.529);
    const vec3 c3 = vec3(0.206, 0.371, 0.553);
    const vec3 c4 = vec3(0.163, 0.471, 0.558);
    const vec3 c5 = vec3(0.128, 0.566, 0.550);
    const vec3 c6 = vec3(0.135, 0.658, 0.517);
    const vec3 c7 = vec3(0.267, 0.749, 0.440);
    const vec3 c8 = vec3(0.478, 0.821, 0.318);
    const vec3 c9 = vec3(0.741, 0.873, 0.150);
    const vec3 c10 = vec3(0.993, 0.906, 0.144);
    
    t = clamp(t, 0.0, 1.0);
    float idx = t * 10.0;
    int i = int(floor(idx));
    float f = fract(idx);
    
    vec3 colors[11];
    colors[0] = c0; colors[1] = c1; colors[2] = c2; colors[3] = c3;
    colors[4] = c4; colors[5] = c5; colors[6] = c6; colors[7] = c7;
    colors[8] = c8; colors[9] = c9; colors[10] = c10;
    
    if (i >= 10) return c10;
    return mix(colors[i], colors[i + 1], f);
  }
  
  vec3 plasma(float t) {
    t = clamp(t, 0.0, 1.0);
    return vec3(
      0.5 + 0.5 * sin(3.14159 * (t * 0.95 + 0.5)),
      0.5 + 0.5 * sin(3.14159 * (t * 1.15 - 0.25)),
      0.5 + 0.5 * sin(3.14159 * (t * 0.75 + 1.1))
    );
  }
  
  vec3 ocean(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 deep = vec3(0.0, 0.02, 0.08);
    vec3 mid = vec3(0.0, 0.2, 0.4);
    vec3 bright = vec3(0.4, 0.9, 1.0);
    
    if (t < 0.5) {
      return mix(deep, mid, t * 2.0);
    }
    return mix(mid, bright, (t - 0.5) * 2.0);
  }
  
  vec3 fire(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 black = vec3(0.0, 0.0, 0.0);
    vec3 red = vec3(0.5, 0.0, 0.0);
    vec3 orange = vec3(0.9, 0.4, 0.0);
    vec3 yellow = vec3(1.0, 0.9, 0.2);
    vec3 white = vec3(1.0, 1.0, 0.9);
    
    if (t < 0.25) return mix(black, red, t * 4.0);
    if (t < 0.5) return mix(red, orange, (t - 0.25) * 4.0);
    if (t < 0.75) return mix(orange, yellow, (t - 0.5) * 4.0);
    return mix(yellow, white, (t - 0.75) * 4.0);
  }
  
  vec3 bioluminescent(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 dark = vec3(0.0, 0.0, 0.02);
    vec3 glow = vec3(0.0, 0.8, 0.6);
    vec3 bright = vec3(0.2, 1.0, 0.8);
    
    float pulse = 0.5 + 0.5 * sin(uTime * 0.5);
    
    if (t < 0.3) {
      return mix(dark, glow * (0.5 + 0.5 * pulse), t / 0.3);
    }
    return mix(glow, bright, (t - 0.3) / 0.7);
  }
  
  void main() {
    vec4 data = texture2D(uState, vUv);
    float state = data.r;
    
    vec3 color;
    
    if (uColorScheme == 0) {
      color = viridis(state);
    } else if (uColorScheme == 1) {
      color = plasma(state);
    } else if (uColorScheme == 2) {
      color = ocean(state);
    } else if (uColorScheme == 3) {
      color = fire(state);
    } else {
      color = bioluminescent(state);
    }
    
    // Subtle vignette
    vec2 uvc = vUv - 0.5;
    float vignette = 1.0 - dot(uvc, uvc) * 0.3;
    color *= vignette;
    
    gl_FragColor = vec4(color, 1.0);
  }
`

// Custom material classes
class ComputeMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uState: { value: null },
        uResolution: { value: new THREE.Vector2(512, 512) },
        uDt: { value: 0.1 },
        uR: { value: 13 },
        uMu: { value: 0.15 },
        uSigma: { value: 0.015 },
        uKernelMu: { value: 0.5 },
        uKernelSigma: { value: 0.15 },
        uBeta: { value: new THREE.Vector4(1, 0, 0, 0) },
        uRingCount: { value: 1 },
      },
      vertexShader,
      fragmentShader: computeShader,
    })
  }
}

class RenderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uState: { value: null },
        uColorScheme: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader,
      fragmentShader: renderShader,
    })
  }
}

extend({ ComputeMaterial, RenderMaterial })

// Type declarations for extended materials
declare module '@react-three/fiber' {
  interface ThreeElements {
    computeMaterial: THREE.ShaderMaterial & { uniforms: Record<string, THREE.IUniform> }
    renderMaterial: THREE.ShaderMaterial & { uniforms: Record<string, THREE.IUniform> }
  }
}

export function LeniaSimulation() {
  const { size, gl } = useThree()
  
  const computeMatRef = useRef<THREE.ShaderMaterial>(null)
  const renderMatRef = useRef<THREE.ShaderMaterial>(null)
  const pingPongRef = useRef<{ read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget } | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
  const quadRef = useRef<THREE.Mesh | null>(null)
  
  const resolution = 512

  // Species presets
  const speciesOptions = useMemo(() => {
    const opts: Record<string, string> = {}
    species.forEach((s) => {
      opts[s.name] = s.name
    })
    return opts
  }, [])

  const [params, setParams] = useControls(() => ({
    Simulation: folder({
      running: { value: true, label: 'Running' },
      speed: { value: 1, min: 1, max: 10, step: 1, label: 'Speed' },
      dt: { value: 0.1, min: 0.01, max: 0.5, step: 0.01, label: 'Time Step' },
    }),
    Kernel: folder({
      R: { value: 13, min: 5, max: 30, step: 1, label: 'Radius' },
      kernelSigma: { value: 0.15, min: 0.05, max: 0.3, step: 0.01, label: 'Peak Width' },
      rings: { value: 1, min: 1, max: 4, step: 1, label: 'Ring Count' },
      beta1: { value: 1.0, min: 0, max: 1, step: 0.1, label: 'Ring 1' },
      beta2: { value: 0.0, min: 0, max: 1, step: 0.1, label: 'Ring 2' },
      beta3: { value: 0.0, min: 0, max: 1, step: 0.1, label: 'Ring 3' },
      beta4: { value: 0.0, min: 0, max: 1, step: 0.1, label: 'Ring 4' },
    }, { collapsed: true }),
    Growth: folder({
      mu: { value: 0.15, min: 0.01, max: 0.5, step: 0.005, label: 'Center (μ)' },
      sigma: { value: 0.015, min: 0.005, max: 0.1, step: 0.001, label: 'Width (σ)' },
    }),
    Display: folder({
      colorScheme: { 
        value: 0, 
        options: { Viridis: 0, Plasma: 1, Ocean: 2, Fire: 3, Bioluminescent: 4 },
        label: 'Colors'
      },
    }),
    Species: folder({
      preset: {
        value: 'Orbium',
        options: speciesOptions,
        label: 'Preset'
      },
      loadPreset: button((get) => { loadSpecies(get('Species.preset')) }),
    }),
    Actions: folder({
      reset: button((_get) => { initializeField('random') }),
      clear: button((_get) => { initializeField('clear') }),
      seed: button((_get) => { initializeField('seed') }),
    }),
  }))

  // Load a species preset
  const loadSpecies = useCallback((name: string) => {
    const spec = species.find(s => s.name === name)
    if (!spec) return
    
    setParams({
      R: spec.R,
      mu: spec.mu,
      sigma: spec.sigma,
      kernelSigma: spec.kernelSigma || 0.15,
      rings: spec.beta?.length || 1,
      beta1: spec.beta?.[0] ?? 1,
      beta2: spec.beta?.[1] ?? 0,
      beta3: spec.beta?.[2] ?? 0,
      beta4: spec.beta?.[3] ?? 0,
    })
    
    // Initialize with species pattern
    setTimeout(() => initializeField('species', spec), 100)
  }, [setParams])

  // Initialize render targets
  useEffect(() => {
    const options = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
    }
    
    pingPongRef.current = {
      read: new THREE.WebGLRenderTarget(resolution, resolution, options),
      write: new THREE.WebGLRenderTarget(resolution, resolution, options),
    }
    
    // Create compute scene
    sceneRef.current = new THREE.Scene()
    cameraRef.current = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    
    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uResolution: { value: new THREE.Vector2(resolution, resolution) },
        uDt: { value: 0.1 },
        uR: { value: 13 },
        uMu: { value: 0.15 },
        uSigma: { value: 0.015 },
        uKernelMu: { value: 0.5 },
        uKernelSigma: { value: 0.15 },
        uBeta: { value: new THREE.Vector4(1, 0, 0, 0) },
        uRingCount: { value: 1 },
      },
      vertexShader,
      fragmentShader: computeShader,
    })
    
    quadRef.current = new THREE.Mesh(geometry, material)
    sceneRef.current.add(quadRef.current)
    computeMatRef.current = material
    
    // Initialize field
    initializeField('random')
    
    return () => {
      pingPongRef.current?.read.dispose()
      pingPongRef.current?.write.dispose()
    }
  }, [])

  // Initialize the field with various patterns
  const initializeField = useCallback((mode: string, spec?: Species) => {
    if (!pingPongRef.current) return
    
    const data = new Float32Array(resolution * resolution * 4)
    
    if (mode === 'clear') {
      // Just zeros
    } else if (mode === 'seed') {
      // Single seed in center
      const cx = Math.floor(resolution / 2)
      const cy = Math.floor(resolution / 2)
      const radius = 20
      
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const dx = x - cx
          const dy = y - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const idx = (y * resolution + x) * 4
          
          if (dist < radius) {
            const val = Math.exp(-dist * dist / (radius * radius * 0.3))
            data[idx] = val * 0.8
          }
        }
      }
    } else if (mode === 'species' && spec?.pattern) {
      // Load species pattern
      const pattern = spec.pattern
      const h = pattern.length
      const w = pattern[0].length
      const ox = Math.floor((resolution - w) / 2)
      const oy = Math.floor((resolution - h) / 2)
      
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const x = ox + px
          const y = oy + py
          if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
            const idx = (y * resolution + x) * 4
            data[idx] = pattern[py][px]
          }
        }
      }
    } else {
      // Random initialization
      const cx = resolution / 2
      const cy = resolution / 2
      const initRadius = 60
      
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const dx = x - cx
          const dy = y - cy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const idx = (y * resolution + x) * 4
          
          if (dist < initRadius) {
            data[idx] = Math.random() * 0.5 + 0.25
          }
        }
      }
    }
    
    // Create data texture
    const texture = new THREE.DataTexture(
      data,
      resolution,
      resolution,
      THREE.RGBAFormat,
      THREE.FloatType
    )
    texture.needsUpdate = true
    
    // Copy to both buffers
    const tempScene = new THREE.Scene()
    const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const tempMaterial = new THREE.MeshBasicMaterial({ map: texture })
    const tempMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), tempMaterial)
    tempScene.add(tempMesh)
    
    gl.setRenderTarget(pingPongRef.current.read)
    gl.render(tempScene, tempCamera)
    gl.setRenderTarget(pingPongRef.current.write)
    gl.render(tempScene, tempCamera)
    gl.setRenderTarget(null)
    
    texture.dispose()
    tempMaterial.dispose()
  }, [gl])

  // Animation loop
  useFrame((state) => {
    if (!pingPongRef.current || !quadRef.current || !sceneRef.current || !cameraRef.current) return
    
    const mat = quadRef.current.material as THREE.ShaderMaterial
    
    // Update uniforms
    mat.uniforms.uDt.value = params.dt
    mat.uniforms.uR.value = params.R
    mat.uniforms.uMu.value = params.mu
    mat.uniforms.uSigma.value = params.sigma
    mat.uniforms.uKernelSigma.value = params.kernelSigma
    mat.uniforms.uBeta.value.set(params.beta1, params.beta2, params.beta3, params.beta4)
    mat.uniforms.uRingCount.value = params.rings
    
    // Run simulation steps
    if (params.running) {
      for (let i = 0; i < params.speed; i++) {
        // Read from current, write to other
        mat.uniforms.uState.value = pingPongRef.current.read.texture
        
        gl.setRenderTarget(pingPongRef.current.write)
        gl.render(sceneRef.current, cameraRef.current)
        gl.setRenderTarget(null)
        
        // Swap buffers
        const temp = pingPongRef.current.read
        pingPongRef.current.read = pingPongRef.current.write
        pingPongRef.current.write = temp
      }
    }
    
    // Update render material
    if (renderMatRef.current) {
      renderMatRef.current.uniforms.uState.value = pingPongRef.current.read.texture
      renderMatRef.current.uniforms.uColorScheme.value = params.colorScheme
      renderMatRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  // Calculate mesh scale to fit viewport while maintaining aspect ratio
  const scale = useMemo(() => {
    const aspect = size.width / size.height
    if (aspect > 1) {
      return [size.height, size.height, 1] as [number, number, number]
    }
    return [size.width, size.width, 1] as [number, number, number]
  }, [size])

  return (
    <mesh scale={scale}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={renderMatRef}
        uniforms={{
          uState: { value: null },
          uColorScheme: { value: 0 },
          uTime: { value: 0 },
        }}
        vertexShader={vertexShader}
        fragmentShader={renderShader}
      />
    </mesh>
  )
}
