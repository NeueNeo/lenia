import { useRef, useMemo, useEffect, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useControls, button, folder } from 'leva'
import * as THREE from 'three'
import { species } from '../data/species'
import type { Species } from '../data/species'

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const computeShader = `
  precision highp float;
  
  uniform sampler2D uState;
  uniform vec2 uResolution;
  uniform float uDt;
  uniform float uR;
  uniform float uMu;
  uniform float uSigma;
  uniform float uKernelSigma;
  uniform vec4 uBeta;
  uniform int uRingCount;
  
  varying vec2 vUv;
  
  // Safe bell function with minimum sigma
  float bell(float x, float mu, float sigma) {
    float safeSigma = max(sigma, 0.001);
    float d = (x - mu) / safeSigma;
    return exp(-d * d / 2.0);
  }
  
  float kernel(float r) {
    if (r >= 1.0) return 0.0;
    float safeKernelSigma = max(uKernelSigma, 0.01);
    float sum = 0.0;
    for (int i = 0; i < 4; i++) {
      if (i >= uRingCount) break;
      float ringCenter = (float(i) + 0.5) / float(uRingCount);
      float d = (r - ringCenter) / safeKernelSigma;
      sum += uBeta[i] * exp(-d * d / 2.0);
    }
    return sum;
  }
  
  float growth(float u) {
    float safeSigma = max(uSigma, 0.001);
    float d = (u - uMu) / safeSigma;
    return 2.0 * exp(-d * d / 2.0) - 1.0;
  }
  
  void main() {
    vec2 pixel = 1.0 / uResolution;
    float kernelSum = 0.0;
    float valueSum = 0.0;
    int radius = int(min(uR, 50.0));
    
    for (int dy = -50; dy <= 50; dy++) {
      if (abs(dy) > radius) continue;
      for (int dx = -50; dx <= 50; dx++) {
        if (abs(dx) > radius) continue;
        float dist = length(vec2(float(dx), float(dy)));
        if (dist > uR) continue;
        float r = dist / max(uR, 1.0);
        float k = kernel(r);
        vec2 sampleUv = fract(vUv + vec2(float(dx), float(dy)) * pixel);
        float texVal = texture2D(uState, sampleUv).r;
        // Skip NaN/Inf values
        if (texVal >= 0.0 && texVal <= 1.0) {
          valueSum += texVal * k;
          kernelSum += k;
        }
      }
    }
    
    float u = kernelSum > 0.001 ? valueSum / kernelSum : 0.0;
    float current = texture2D(uState, vUv).r;
    // Protect against NaN in current state
    if (!(current >= 0.0 && current <= 1.0)) current = 0.0;
    float newState = clamp(current + uDt * growth(u), 0.0, 1.0);
    gl_FragColor = vec4(newState, u, 0.0, 1.0);
  }
`

const renderShader = `
  precision highp float;
  uniform sampler2D uState;
  uniform vec2 uResolution;
  uniform int uColorScheme;
  uniform float uTime;
  uniform float uAA; // 0 = off, 1+ = samples
  varying vec2 vUv;
  
  vec3 viridis(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c0 = vec3(0.267, 0.004, 0.329);
    vec3 c1 = vec3(0.128, 0.566, 0.550);
    vec3 c2 = vec3(0.993, 0.906, 0.144);
    return mix(mix(c0, c1, t * 2.0), mix(c1, c2, (t - 0.5) * 2.0), step(0.5, t));
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
    vec3 mid = vec3(0.0, 0.25, 0.5);
    vec3 bright = vec3(0.3, 0.9, 1.0);
    return t < 0.5 ? mix(deep, mid, t * 2.0) : mix(mid, bright, (t - 0.5) * 2.0);
  }
  
  vec3 fire(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 black = vec3(0.0);
    vec3 red = vec3(0.6, 0.0, 0.0);
    vec3 orange = vec3(1.0, 0.5, 0.0);
    vec3 yellow = vec3(1.0, 1.0, 0.3);
    if (t < 0.33) return mix(black, red, t * 3.0);
    if (t < 0.66) return mix(red, orange, (t - 0.33) * 3.0);
    return mix(orange, yellow, (t - 0.66) * 3.0);
  }
  
  vec3 bioluminescent(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 dark = vec3(0.0, 0.0, 0.03);
    vec3 glow = vec3(0.0, 0.7, 0.5);
    vec3 bright = vec3(0.3, 1.0, 0.8);
    float pulse = 0.5 + 0.5 * sin(uTime * 0.5);
    vec3 glowMod = glow * (0.7 + 0.3 * pulse);
    return t < 0.4 ? mix(dark, glowMod, t / 0.4) : mix(glowMod, bright, (t - 0.4) / 0.6);
  }
  
  vec3 getColor(float state) {
    if (uColorScheme == 0) return viridis(state);
    else if (uColorScheme == 1) return plasma(state);
    else if (uColorScheme == 2) return ocean(state);
    else if (uColorScheme == 3) return fire(state);
    else return bioluminescent(state);
  }
  
  void main() {
    vec2 pixel = 1.0 / uResolution;
    vec3 color;
    
    if (uAA < 0.5) {
      // No AA - single sample
      float state = texture2D(uState, vUv).r;
      color = getColor(state);
    } else if (uAA < 1.5) {
      // 4x AA - rotated grid
      vec2 offsets[4];
      offsets[0] = vec2(-0.25, -0.75);
      offsets[1] = vec2(0.75, -0.25);
      offsets[2] = vec2(-0.75, 0.25);
      offsets[3] = vec2(0.25, 0.75);
      color = vec3(0.0);
      for (int i = 0; i < 4; i++) {
        float s = texture2D(uState, vUv + offsets[i] * pixel).r;
        color += getColor(s);
      }
      color *= 0.25;
    } else {
      // 9x AA - 3x3 grid with gaussian weights
      float weights[9];
      weights[0] = 0.0625; weights[1] = 0.125; weights[2] = 0.0625;
      weights[3] = 0.125;  weights[4] = 0.25;  weights[5] = 0.125;
      weights[6] = 0.0625; weights[7] = 0.125; weights[8] = 0.0625;
      color = vec3(0.0);
      int idx = 0;
      for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
          vec2 offset = vec2(float(dx), float(dy)) * pixel;
          float s = texture2D(uState, vUv + offset).r;
          color += getColor(s) * weights[idx];
          idx++;
        }
      }
    }
    
    vec2 uvc = vUv - 0.5;
    color *= 1.0 - dot(uvc, uvc) * 0.4;
    gl_FragColor = vec4(color, 1.0);
  }
`

const resolution = 512

interface LeniaSimulationProps {
  onSpeciesChange?: (name: string) => void
}

export function LeniaSimulation({ onSpeciesChange }: LeniaSimulationProps) {
  const { gl, size } = useThree()
  const meshRef = useRef<THREE.Mesh>(null)
  const [targets] = useState(() => {
    const opts: THREE.RenderTargetOptions = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
    }
    return {
      read: new THREE.WebGLRenderTarget(resolution, resolution, opts),
      write: new THREE.WebGLRenderTarget(resolution, resolution, opts),
    }
  })
  
  const [computeScene] = useState(() => new THREE.Scene())
  const [computeCamera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1))
  const [computeMaterial] = useState(() => new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null },
      uResolution: { value: new THREE.Vector2(resolution, resolution) },
      uDt: { value: 0.1 },
      uR: { value: 13 },
      uMu: { value: 0.15 },
      uSigma: { value: 0.015 },
      uKernelSigma: { value: 0.15 },
      uBeta: { value: new THREE.Vector4(1, 0, 0, 0) },
      uRingCount: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: computeShader,
  }))
  
  const [renderMaterial] = useState(() => new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null },
      uResolution: { value: new THREE.Vector2(resolution, resolution) },
      uColorScheme: { value: 0 },
      uTime: { value: 0 },
      uAA: { value: 0 },
    },
    vertexShader,
    fragmentShader: renderShader,
  }))
  
  const [isInitialized, setIsInitialized] = useState(false)

  const speciesOptions = useMemo(() => {
    const opts: Record<string, string> = {}
    species.forEach((s) => { opts[s.name] = s.name })
    return opts
  }, [])

  const [params, setParams] = useControls(() => ({
    Simulation: folder({
      running: { value: true, label: 'Running' },
      speed: { value: 1, min: 1, max: 10, step: 1, label: 'Speed' },
      dt: { value: 0.1, min: 0.01, max: 0.5, step: 0.01, label: 'Time Step' },
    }),
    Kernel: folder({
      R: { value: 13, min: 5, max: 25, step: 1, label: 'Radius' },
      kernelSigma: { value: 0.15, min: 0.08, max: 0.3, step: 0.01, label: 'Peak Width' },
      rings: { value: 1, min: 1, max: 4, step: 1, label: 'Ring Count' },
      beta1: { value: 1.0, min: 0, max: 1, step: 0.1, label: 'Ring 1' },
      beta2: { value: 0.0, min: 0, max: 1, step: 0.1, label: 'Ring 2' },
      beta3: { value: 0.0, min: 0, max: 1, step: 0.1, label: 'Ring 3' },
      beta4: { value: 0.0, min: 0, max: 1, step: 0.1, label: 'Ring 4' },
    }, { collapsed: true }),
    Growth: folder({
      mu: { value: 0.15, min: 0.01, max: 0.5, step: 0.005, label: 'Center (μ)' },
      sigma: { value: 0.015, min: 0.008, max: 0.1, step: 0.001, label: 'Width (σ)' },
    }),
    Display: folder({
      colorScheme: { value: 0, options: { Viridis: 0, Plasma: 1, Ocean: 2, Fire: 3, Bioluminescent: 4 }, label: 'Colors' },
      antialiasing: { value: 0, options: { Off: 0, '4x': 1, '9x': 2 }, label: 'Antialiasing' },
    }),
    Species: folder({
      preset: { 
        value: 'Orbium', 
        options: speciesOptions, 
        label: 'Preset',
        onChange: (v: string) => { loadSpecies(v) },
      },
    }),
    Actions: folder({
      reset: button(() => { initField('random') }),
      clear: button(() => { initField('clear') }),
      seed: button(() => { initField('seed') }),
    }),
  }))

  const initField = useCallback((mode: string, spec?: Species) => {
    const data = new Float32Array(resolution * resolution * 4)
    const cx = resolution / 2, cy = resolution / 2
    
    if (mode === 'seed') {
      const r = 20
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const d = Math.sqrt((x-cx)**2 + (y-cy)**2)
          if (d < r) data[(y * resolution + x) * 4] = Math.exp(-d*d/(r*r*0.3)) * 0.8
        }
      }
    } else if (mode === 'species' && spec?.pattern) {
      const p = spec.pattern, h = p.length, w = p[0].length
      const ox = Math.floor((resolution - w) / 2), oy = Math.floor((resolution - h) / 2)
      for (let py = 0; py < h; py++) {
        for (let px = 0; px < w; px++) {
          const x = ox + px, y = oy + py
          if (x >= 0 && x < resolution && y >= 0 && y < resolution) {
            data[(y * resolution + x) * 4] = p[py][px]
          }
        }
      }
    } else if (mode !== 'clear') {
      const r = 60
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const d = Math.sqrt((x-cx)**2 + (y-cy)**2)
          if (d < r) data[(y * resolution + x) * 4] = Math.random() * 0.5 + 0.25
        }
      }
    }
    
    const tex = new THREE.DataTexture(data, resolution, resolution, THREE.RGBAFormat, THREE.FloatType)
    tex.needsUpdate = true
    
    const scene = new THREE.Scene()
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const mat = new THREE.MeshBasicMaterial({ map: tex })
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat))
    
    gl.setRenderTarget(targets.read)
    gl.render(scene, cam)
    gl.setRenderTarget(targets.write)
    gl.render(scene, cam)
    gl.setRenderTarget(null)
    
    tex.dispose()
    mat.dispose()
    setIsInitialized(true)
  }, [gl, targets])

  const loadSpecies = useCallback((name: string) => {
    const spec = species.find(s => s.name === name)
    if (!spec) return
    setParams({
      R: spec.R, mu: spec.mu, sigma: spec.sigma,
      kernelSigma: spec.kernelSigma || 0.15,
      rings: spec.beta?.length || 1,
      beta1: spec.beta?.[0] ?? 1, beta2: spec.beta?.[1] ?? 0,
      beta3: spec.beta?.[2] ?? 0, beta4: spec.beta?.[3] ?? 0,
    })
    onSpeciesChange?.(name)
    // Use random init - more stable than small preset patterns
    setTimeout(() => initField('random'), 50)
  }, [setParams, initField, onSpeciesChange])

  // Setup compute scene
  useEffect(() => {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), computeMaterial)
    computeScene.add(quad)
    initField('random')
    onSpeciesChange?.('Orbium') // Initial species
    return () => { targets.read.dispose(); targets.write.dispose() }
  }, [])

  useFrame((state) => {
    if (!isInitialized) return
    
    // Update compute uniforms
    computeMaterial.uniforms.uDt.value = params.dt
    computeMaterial.uniforms.uR.value = params.R
    computeMaterial.uniforms.uMu.value = params.mu
    computeMaterial.uniforms.uSigma.value = params.sigma
    computeMaterial.uniforms.uKernelSigma.value = params.kernelSigma
    computeMaterial.uniforms.uBeta.value.set(params.beta1, params.beta2, params.beta3, params.beta4)
    computeMaterial.uniforms.uRingCount.value = params.rings
    
    // Run simulation
    if (params.running) {
      for (let i = 0; i < params.speed; i++) {
        computeMaterial.uniforms.uState.value = targets.read.texture
        gl.setRenderTarget(targets.write)
        gl.render(computeScene, computeCamera)
        gl.setRenderTarget(null)
        // Swap
        const tmp = targets.read
        targets.read = targets.write
        targets.write = tmp
      }
    }
    
    // Update display
    renderMaterial.uniforms.uState.value = targets.read.texture
    renderMaterial.uniforms.uColorScheme.value = params.colorScheme
    renderMaterial.uniforms.uTime.value = state.clock.elapsedTime
    renderMaterial.uniforms.uAA.value = params.antialiasing
  })

  const scale = useMemo(() => {
    const s = Math.min(size.width, size.height)
    return [s, s, 1] as [number, number, number]
  }, [size])

  return (
    <mesh ref={meshRef} scale={scale} material={renderMaterial}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}
