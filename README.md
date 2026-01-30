# Lenia

**Continuous Cellular Automata** — Mathematical life forms in your browser.

![Lenia Screenshot](https://raw.githubusercontent.com/NeueNeo/lenia/main/screenshot.png)

## What is Lenia?

Lenia is a family of continuous cellular automata created by [Bert Wang-Chak Chan](https://chakazul.github.io/lenia.html). It extends Conway's Game of Life into a continuous domain with:

- **Continuous states** — Cell values range from 0 to 1
- **Continuous space** — Smooth kernels instead of discrete neighbors
- **Continuous time** — Configurable time steps for fluid animation

The result is organic, lifelike patterns that self-organize, move, and interact in ways that feel genuinely *alive*.

## Features

- 🧬 **13 species presets** — Including Orbium, Gyrorbium, Helix, and more
- 🎨 **5 color schemes** — Viridis, Plasma, Ocean, Fire, Bioluminescent
- ⚡ **GPU-accelerated** — Real-time simulation via WebGL shaders
- 🎛️ **Interactive controls** — Adjust kernel radius, growth parameters, and more
- 🔄 **Toroidal boundary** — Patterns wrap around edges seamlessly

## Math

The update rule:

```
A(t + Δt) = clip[A(t) + Δt × G(K ★ A)]
```

Where:
- `A` is the state field
- `K` is the convolution kernel (gaussian rings)
- `G` is the growth function (gaussian centered at μ)
- `Δt` is the time step

## Running Locally

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
```

## Deploy to Cloudflare Pages

```bash
npx wrangler pages deploy dist
```

## References

- [Lenia: Biology of Artificial Life](https://arxiv.org/abs/1812.05433) — Original paper by Bert Chan
- [Lenia Portal](https://chakazul.github.io/lenia.html) — Bert Chan's project page
- [Particle Lenia](https://google-research.github.io/self-organising-systems/particle-lenia/) — Google Research extension

## License

MIT
