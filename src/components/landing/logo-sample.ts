/** Logo contoh untuk demo (SVG sebagai data URL). */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="56" fill="#ea2e00"/><path d="M60 26 88 40v32L60 86 32 72V40z" fill="#f0e7d6"/><path d="M60 54 88 40v32L60 86z" fill="#9dbdb8"/><path d="M60 54v32" stroke="#1f1a17" stroke-width="3" stroke-dasharray="5 4"/><text x="60" y="108" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="800" fill="#f0e7d6" text-anchor="middle">LIPATIN</text></svg>`;

export const LOGO_SAMPLE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
