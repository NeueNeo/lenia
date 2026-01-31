# Lenia Project Status

**Last updated:** 2026-01-30 ~22:30 CST

## Current State: COMPLETE ✅

All 13 species working. Clean UI shipped.

## Working Species

| Species | Category | Status |
|---------|----------|--------|
| Orbium | classic | ✅ |
| Orbium bicaudatus | classic | ✅ |
| Gyrorbium | classic | ✅ |
| Scutium | classic | ✅ |
| Helix | exotic | ✅ |
| Hydrogeminium | exotic | ✅ |
| Pentafolium | exotic | ✅ |
| Paramecia | inspired | ✅ |
| SmoothLife | inspired | ✅ |
| Primordial Soup | chaotic | ✅ |
| Microbia | exotic | ✅ |
| Oceania | exotic | ✅ |
| Luminara | exotic | ✅ |

## UI Components

- Species dropdown + Respawn button
- Display dropdown (5 color schemes)
- Pause/Play button  
- Info card with species descriptions

## Technical Notes

**Core equation:**
```
A(t+Δt) = clamp(A(t) + Δt * G(K*A), 0, 1)
```

**Kernel:** Gaussian rings, R=radius, kernelSigma=width, beta=weights

**Growth:** G(u) = 2 * exp(-(u-μ)² / 2σ²) - 1

**Implementation:** 512x512 resolution, ping-pong WebGL render targets

## Git History

- `681bba5` - Simplify UI: Species/Display panels, remove Leva complexity
- Pushed to `NeueNeo/lenia`
