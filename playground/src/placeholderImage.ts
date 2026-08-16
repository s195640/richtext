// Self-contained sample media for the playground — inline SVG data URIs so
// the demo works fully offline, with no external services required.
export function placeholderImage(label: string, color: string, w = 640, h = 420): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="100%" height="100%" fill="${color}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
      font-family="sans-serif" font-size="28" fill="rgba(255,255,255,0.85)">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
