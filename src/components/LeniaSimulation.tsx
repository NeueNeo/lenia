import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { species as speciesList, type Species } from '../data/species'

// Vertex shader - simple passthrough
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

// Compute shader - Lenia update step
// Core equation: A(t+dt) = clamp(A(t) + dt * G(K*A), 0, 1)
// Kernel K: Gaussian rings at radii n/N with weights beta[n]
// Growth G(u) = 2 * exp(-(u-mu)^2 / 2*sigma^2) - 1
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
  
  // Kernel function: sum of Gaussian rings
  // r is normalized distance (0 to 1 within kernel radius)
  float kernel(float r) {
    if (r >= 1.0) return 0.0;
    
    float ks = max(uKernelSigma, 0.01);
    float sum = 0.0;
    
    // Each ring is centered at (n + 0.5) / N
    for (int i = 0; i < 4; i++) {
      if (i >= uRingCount) break;
      float ringCenter = (float(i) + 0.5) / float(uRingCount);
      float d = (r - ringCenter) / ks;
      sum += uBeta[i] * exp(-d * d / 2.0);
    }
    
    return sum;
  }
  
  // Growth function: Gaussian bump centered at mu
  // Returns value in [-1, 1]
  // Positive near mu (grow), negative away from mu (shrink)
  float growth(float u) {
    float s = max(uSigma, 0.001);
    float d = (u - uMu) / s;
    return 2.0 * exp(-d * d / 2.0) - 1.0;
  }
  
  void main() {
    vec2 pixel = 1.0 / uResolution;
    
    // Compute kernel convolution K * A
    // This gives the "perception" field - weighted average of neighbors
    float kernelSum = 0.0;
    float valueSum = 0.0;
    
    int iR = int(min(uR, 25.0)); // Cap for performance
    
    for (int dy = -25; dy <= 25; dy++) {
      if (abs(dy) > iR) continue;
      for (int dx = -25; dx <= 25; dx++) {
        if (abs(dx) > iR) continue;
        
        float dist = length(vec2(float(dx), float(dy)));
        if (dist > uR) continue;
        
        // Normalized distance within kernel
        float r = dist / uR;
        float k = kernel(r);
        
        // Toroidal wrap (fract handles it)
        vec2 sampleUv = fract(vUv + vec2(float(dx), float(dy)) * pixel);
        float v = texture2D(uState, sampleUv).r;
        
        valueSum += v * k;
        kernelSum += k;
      }
    }
    
    // Normalized convolution result
    float u = kernelSum > 0.0 ? valueSum / kernelSum : 0.0;
    
    // Apply growth function and update
    float current = texture2D(uState, vUv).r;
    float g = growth(u);
    float newState = clamp(current + uDt * g, 0.0, 1.0);
    
    // Store state in R, convolution result in G (for debugging)
    gl_FragColor = vec4(newState, u, 0.0, 1.0);
  }
`

// Render shader - visualization
const renderShader = `
  precision highp float;
  
  uniform sampler2D uState;
  uniform int uColorScheme;
  uniform float uTime;
  
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
    vec3 glowMod = glow * (0.8 + 0.2 * pulse);
    return t < 0.4 ? mix(dark, glowMod, t / 0.4) : mix(glowMod, bright, (t - 0.4) / 0.6);
  }
  
  void main() {
    float state = texture2D(uState, vUv).r;
    
    vec3 color;
    if (uColorScheme == 0) color = viridis(state);
    else if (uColorScheme == 1) color = plasma(state);
    else if (uColorScheme == 2) color = ocean(state);
    else if (uColorScheme == 3) color = fire(state);
    else color = bioluminescent(state);
    
    // Subtle vignette
    vec2 uvc = vUv - 0.5;
    color *= 1.0 - dot(uvc, uvc) * 0.3;
    
    gl_FragColor = vec4(color, 1.0);
  }
`

const RESOLUTION = 512

export interface LeniaSimulationHandle {
  loadSpecies: (name: string) => void
  respawn: () => void
}

interface Props {
  colorScheme: number
  isPaused: boolean
}

export const LeniaSimulation = forwardRef<LeniaSimulationHandle, Props>(
  function LeniaSimulation({ colorScheme, isPaused }, ref) {
    const { gl, size } = useThree()
    const meshRef = useRef<THREE.Mesh>(null)
    
    // Current species parameters
    const paramsRef = useRef<Species>(speciesList[0])
    
    // Double-buffered render targets for ping-pong
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
        read: new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, opts),
        write: new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, opts),
      }
    })
    
    // Compute pass scene
    const [computeScene] = useState(() => new THREE.Scene())
    const [computeCamera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1))
    const [computeMaterial] = useState(() => new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uResolution: { value: new THREE.Vector2(RESOLUTION, RESOLUTION) },
        uDt: { value: 0.1 },
        uR: { value: 13 },
        uMu: { value: 0.15 },
        uSigma: { value: 0.015 },
        uKernelSigma: { value: 0.15 },
        uBeta: { value: new THREE.Vector4(1, 0, 0, 0) },
        uRingCount: { value: 1 },
      },
      vertexShader,
      fragmentShader: computeShader,
    }))
    
    // Render pass material
    const [renderMaterial] = useState(() => new THREE.ShaderMaterial({
      uniforms: {
        uState: { value: null },
        uColorScheme: { value: 0 },
        uTime: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: renderShader,
    }))
    
    const isInitializedRef = useRef(false)
    const needsInitRef = useRef(true)

    // Initialize the field with a pattern
    const initField = useCallback((spec: Species) => {
      const data = new Float32Array(RESOLUTION * RESOLUTION * 4)
      const cx = RESOLUTION / 2
      const cy = RESOLUTION / 2

      // Initialize all pixels with alpha = 1
      for (let i = 0; i < RESOLUTION * RESOLUTION; i++) {
        data[i * 4 + 3] = 1.0
      }

      // Blob size scales with kernel radius - larger kernels need larger blobs
      // Only Microbia (R=7) gets multiple smaller blobs
      const isSmallKernel = spec.R <= 7

      if (isSmallKernel) {
        // Multiple small dense blobs for small-kernel species
        // Use higher density - these species form from dense clusters
        const blobRadius = spec.R * 5
        const spacing = blobRadius * 2.5
        const startOffset = RESOLUTION / 2 - spacing

        for (let by = 0; by < 3; by++) {
          for (let bx = 0; bx < 3; bx++) {
            const bcx = startOffset + bx * spacing
            const bcy = startOffset + by * spacing

            for (let y = 0; y < RESOLUTION; y++) {
              for (let x = 0; x < RESOLUTION; x++) {
                const d = Math.sqrt((x - bcx) ** 2 + (y - bcy) ** 2)
                if (d < blobRadius) {
                  // Higher density for small-kernel species
                  const noise = (Math.random() - 0.5) * 0.1
                  const val = Math.max(0.3, Math.min(1, 0.7 + noise))
                  data[(y * RESOLUTION + x) * 4] = val
                }
              }
            }
          }
        }
      } else {
        // Single large blob for normal-kernel species
        const blobRadius = 120

        for (let y = 0; y < RESOLUTION; y++) {
          for (let x = 0; x < RESOLUTION; x++) {
            const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if (d < blobRadius) {
              const noise = (Math.random() - 0.5) * spec.sigma
              const val = Math.max(0.01, Math.min(1, spec.mu + noise))
              data[(y * RESOLUTION + x) * 4] = val
            }
          }
        }
      }

      // Upload to texture using a shader to ensure proper copying
      const tex = new THREE.DataTexture(
        data, RESOLUTION, RESOLUTION,
        THREE.RGBAFormat, THREE.FloatType
      )
      tex.needsUpdate = true

      // Use a simple copy shader instead of MeshBasicMaterial
      const copyMaterial = new THREE.ShaderMaterial({
        uniforms: { tSource: { value: tex } },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `uniform sampler2D tSource; varying vec2 vUv; void main() { gl_FragColor = texture2D(tSource, vUv); }`,
      })

      const scene = new THREE.Scene()
      const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial))

      gl.setRenderTarget(targets.read)
      gl.render(scene, cam)
      gl.setRenderTarget(targets.write)
      gl.render(scene, cam)
      gl.setRenderTarget(null)

      tex.dispose()
      copyMaterial.dispose()

      isInitializedRef.current = true
    }, [gl, targets])

    // Update compute uniforms from species params
    const updateUniforms = useCallback((spec: Species) => {
      computeMaterial.uniforms.uR.value = spec.R
      computeMaterial.uniforms.uMu.value = spec.mu
      computeMaterial.uniforms.uSigma.value = spec.sigma
      computeMaterial.uniforms.uKernelSigma.value = spec.kernelSigma || 0.15
      
      const beta = spec.beta || [1]
      computeMaterial.uniforms.uBeta.value.set(
        beta[0] ?? 0,
        beta[1] ?? 0,
        beta[2] ?? 0,
        beta[3] ?? 0
      )
      computeMaterial.uniforms.uRingCount.value = beta.length
    }, [computeMaterial])

    // Load a species by name
    const loadSpecies = useCallback((name: string) => {
      const spec = speciesList.find(s => s.name === name)
      if (!spec) return
      
      paramsRef.current = spec
      updateUniforms(spec)
      initField(spec)
    }, [updateUniforms, initField])

    // Respawn current species
    const respawn = useCallback(() => {
      initField(paramsRef.current)
    }, [initField])

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      loadSpecies,
      respawn,
    }), [loadSpecies, respawn])

    // Initial setup - just add compute quad, defer actual init to first frame
    useEffect(() => {
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), computeMaterial)
      computeScene.add(quad)

      return () => {
        targets.read.dispose()
        targets.write.dispose()
      }
    }, [computeMaterial, computeScene, targets])

    // Animation loop
    useFrame((state) => {
      // Initialize on first frame when GL is definitely ready
      if (needsInitRef.current) {
        needsInitRef.current = false
        const defaultSpec = speciesList[0]
        paramsRef.current = defaultSpec
        updateUniforms(defaultSpec)
        initField(defaultSpec)
        renderMaterial.uniforms.uState.value = targets.read.texture
      }

      if (!isInitializedRef.current) return

      // Run simulation step
      if (!isPaused) {
        computeMaterial.uniforms.uState.value = targets.read.texture
        gl.setRenderTarget(targets.write)
        gl.render(computeScene, computeCamera)
        gl.setRenderTarget(null)
        
        // Swap buffers
        const tmp = targets.read
        targets.read = targets.write
        targets.write = tmp
      }
      
      // Update render uniforms
      renderMaterial.uniforms.uState.value = targets.read.texture
      renderMaterial.uniforms.uColorScheme.value = colorScheme
      renderMaterial.uniforms.uTime.value = state.clock.elapsedTime
    })

    // Scale to fit viewport
    const scale = Math.min(size.width, size.height)

    return (
      <mesh ref={meshRef} scale={[scale, scale, 1]} material={renderMaterial}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    )
  }
)
