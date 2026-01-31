# Lenia Project Status

**Last updated:** 2026-01-30 ~21:10 CST

## Current State: BROKEN

NeueBot made destructive changes without full context. Cursor Claude is fixing.

## What Was Requested

Simplify the UI:
- Species panel: dropdown to select preset + Respawn button
- Display panel: color scheme selector
- NO exposed Growth/Kernel parameter sliders (remove Leva complexity)
- Keep InfoCard / right panel with species descriptions

## What Got Broken

- App.tsx rewritten, removed Leva but added non-existent CSS classes
- LeniaSimulation.tsx rewritten with different interface (forwardRef)
- InfoCard component deleted from App.tsx (still exists in components/)
- CSS classes referenced don't exist in App.css

## Files Modified

- `src/App.tsx` — needs fixing
- `src/components/LeniaSimulation.tsx` — needs fixing or reverting
- `src/components/InfoCard.tsx` — exists, just not imported

## What Should Work

The goal is simple controls without Leva:
1. Species dropdown → loads preset params + pattern
2. Respawn button → reinitializes field
3. Color scheme dropdown → changes visualization
4. Pause/Play button
5. InfoCard showing species description

## Technical Notes

Lenia core math (working in previous version):
- State update: A(t+Δt) = clamp(A(t) + Δt * G(K*A), 0, 1)
- Kernel K: Gaussian rings with beta weights
- Growth G(u) = 2 * exp(-(u-μ)² / 2σ²) - 1

Resolution: 512x512, ping-pong render targets for GPU compute.

## Recovery Options

1. `git checkout HEAD~1 -- src/` to revert to last working state
2. Or fix the current broken files manually

## Next Steps

Wait for Cursor Claude to fix, then verify it works before adding complexity.
