export function createFuzzySearch(text: string) {
  // Normalizar texto y crear expresión regular flexible
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  const terms = normalized.split(/\s+/).filter(Boolean);
  
  return terms.map(term => ({
    contains: term,
    mode: 'insensitive' as const,
  }));
}