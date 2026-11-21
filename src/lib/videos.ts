/** Busca en YouTube; la IA solo propone el texto de búsqueda, nunca un enlace que podría no existir. */
export function enlaceVideo(busqueda: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(busqueda)}`;
}
