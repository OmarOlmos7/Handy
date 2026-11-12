// Ilustraciones en SVG que genera la IA para la hoja impresa.

/** Acepta solo un SVG simple (sin scripts, enlaces, imágenes ni eventos). Se muestra como <img>. */
export function svgSeguro(svg: string): string | undefined {
  const t = svg.trim();
  if (!/^<svg[\s>]/i.test(t) || !/<\/svg>\s*$/i.test(t) || t.length > 20000) return undefined;
  if (/<(script|foreignObject|image|a|iframe|use|style)\b|\son\w+\s*=|javascript:|href\s*=|url\(/i.test(t)) return undefined;
  return t.includes("xmlns=") ? t : t.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}
