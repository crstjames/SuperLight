# SūperLight ⚡

A markdown editor that remembers when software was fast

## Philosophy

In a world of bloated web apps that take 30 seconds to load and eat your RAM for breakfast, SūperLight is different. We believe software should be **instant**, **focused**, and **beautiful**. No frameworks. No dependencies. No nonsense.

Just pure, crystalline functionality that loads in milliseconds and works offline forever.

## What It Is

SūperLight is a markdown editor that fits in a single HTML file. It's smaller than most images on the web, yet more capable than editors 100x its size. Real-time preview, dark mode, sharing, PWA installation – everything you need, nothing you don't.

**File size**: ~85KB  
**Dependencies**: 0  
**Load time**: Instant  
**Works offline**: Always

## Features

### Core

- **Split-screen editing** – Code and preview, side by side
- **Real-time rendering** – See changes as you type
- **Three view modes** – Code, split, or preview only
- **Dark/light themes** – Switches faster than your mood

### Sharing & Import

- **URL compression** – Share documents via link (with gzip magic)
- **File import** – Drag, drop, or browse
- **Export ready** – Download as .md instantly
- **Paste anything** – Text, links, encoded content

### Polish

- **PWA ready** – Install like a native app
- **Offline first** – No internet? No problem
- **Mobile perfect** – Responsive on every screen
- **Keyboard shortcuts** – For the power users

## Quick Start

```bash
# Clone and serve
git clone [your-repo-url]
cd superlight
python3 -m http.server 8000
```

Open `http://localhost:8000`

That's it. No npm install. No build process. No waiting.

## Technical Details

### Architecture

- **Vanilla everything** – HTML5, CSS3, ES6+
- **Service Worker** – For caching and offline capability
- **PWA Manifest** – Full app installation support
- **Base64 + Gzip** – Smart compression for sharing

### Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Why No Frameworks?

Because we don't need them. Modern browsers are incredibly capable. By staying close to the platform, we get:

- **Speed** – No framework overhead
- **Reliability** – Fewer moving parts
- **Longevity** – Won't break when React 47 comes out
- **Simplicity** – Easy to understand, modify, extend

## Design Principles

### Minimal Surface Area

Every feature must justify its existence. If it doesn't make editing markdown faster or more pleasant, it doesn't belong.

### Instant Feedback

No loading spinners. No "building..." messages. Changes happen at the speed of thought.

### Offline Forever

Your work shouldn't depend on WiFi. Everything works offline, always.

### Beautiful Defaults

Dark mode that doesn't hurt. Typography that breathes. Colors that make sense.

## File Structure

```text
superlight/
├── index.html          # The entire app (HTML + CSS + JS)
├── sw.js               # Service worker for PWA features
├── manifest.json       # PWA manifest
├── browserconfig.xml   # Windows tile config
└── README.md          # This file
```

## Development

Want to hack on SūperLight? It's just HTML, CSS, and JavaScript. No build tools required.

### Local Development

```bash
python3 -m http.server 8000
```

### Key Functions

- `mdToHtml()` – Markdown parser
- `renderAll()` – Updates preview
- `generateShareOptions()` – Creates shareable links
- `tryDecodeContent()` – Handles imports

### Adding Features

1. Edit `index.html`
2. Refresh browser
3. Done

No webpack. No babel. No complexity.

## Sharing & Encoding

SūperLight uses smart compression for sharing:

1. **Small docs** → Direct URL encoding
2. **Large docs** → Gzip + Base64URL
3. **Huge docs** → Encoded text for manual sharing

All handled automatically. Recipients just paste into the Import dialog.

## PWA Installation

### Desktop

1. Visit the app in Chrome/Edge
2. Look for install icon in address bar
3. Click to install

### Mobile

1. Visit in Safari/Chrome
2. Tap Share button
3. Select "Add to Home Screen"

## License

MIT License – Use it, modify it, make it yours.

## Philosophy (Expanded)

We're tired of web apps that feel like desktop apps from 1995. Slow, bloated, resource-hungry monsters that need gigabytes of RAM to display text.

SūperLight is our love letter to the early web – when sites loaded instantly and did exactly what they promised. When software was a tool, not a platform.

In an age of complexity, we choose simplicity.  
In an age of bloat, we choose efficiency.  
In an age of frameworks, we choose fundamentals.

**SūperLight**: Because your markdown editor shouldn't need more RAM than Photoshop.

---

Made with ⚡ and a healthy disrespect for the status quo
