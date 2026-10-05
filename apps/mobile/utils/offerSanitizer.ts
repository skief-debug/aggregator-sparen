export interface RawApiItem {
  id: string | number;
  storeId?: string;
  storeName?: string;
  brand?: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  currentPrice?: number;
  oldPrice?: number;
  originalPrice?: number;
  discount?: number;
  discountPercentage?: number;
  imageUrl?: string;
  image?: string;
  validFrom?: string;
  validTo?: string;
  category?: string;
}

export interface CleanOffer {
  id: string;
  storeId: string;
  storeName: string;
  cleanTitle: string;
  subtitle: string;
  imageUrl: string;
  dealPrice: number;
  originalPrice: number | null;
  discountPercent: number;
  isAppExclusive: boolean;
  validityText: string;
  category: string;
}

// Bereinigt fehlerhafte Titel und entfernt Füllwörter / Handelsklassen
function sanitizeProductTitle(rawTitle: string, brand?: string): { title: string; subtitle: string } {
  let title = rawTitle || brand || 'Aktionsartikel';
  let subtitle = '';

  // App-Hinweise und Metadaten aus dem Haupttitel entfernen
  const junkPatterns = [
    /Hinweis mit App.*$/gi,
    /Mit App.*$/gi,
    /Klasse\s+[I|1|2|II]+/gi,
    /je\s+\d+.*$/gi,
    /\d+g\s+Packung/gi,
    /\d+kg\s+Beutel/gi,
    /\(1\s*[l|kg]\s*=\s*[\d,.]+\s*€?\)/gi,
  ];

  // Mögliche Mengenangaben als Subtitle extrahieren
  const unitMatch = title.match(/(\d+[\s-]?[g|kg|ml|l|Stück|Bund]+)/i);
  if (unitMatch) {
    subtitle = unitMatch[0];
  }

  junkPatterns.forEach((pattern) => {
    title = title.replace(pattern, '').trim();
  });

  // Satzzeichen am Ende säubern
  title = title.replace(/[,;:\-–]+$/, '').trim();

  // Falls Titel leer bereinigt wurde, Brand nutzen
  if (title.length < 2 && brand) {
    title = brand;
  }

  return { title: title || 'Aktionsartikel', subtitle };
}

// Erkennt App-Coupons (Lidl Plus, Penny App, Kaufland Card etc.)
function detectAppExclusivity(text: string): boolean {
  const normalized = text.toLowerCase();
  const appKeywords = ['lidl plus', 'penny app', 'vorteilscode', 'app preis', 'kaufland card', 'mit app', 'rewe app', 'app-rabatt'];
  return appKeywords.some((kw) => normalized.includes(kw));
}

// Haupt-Sanitizer für die API-Payload
export function sanitizeApiOffers(rawItems: RawApiItem[], targetStoreId?: string): CleanOffer[] {
  return rawItems
    .filter((item) => {
      // 1. Strikte Store-Zuordnung prüfen (verhindert falsche Läden wie REWE im Lidl-Feed)
      if (targetStoreId && item.storeId) {
        return item.storeId.toLowerCase().includes(targetStoreId.toLowerCase());
      }
      return true;
    })
    .map((item) => {
      const dealPrice = item.currentPrice ?? item.price ?? 0;
      const originalPrice = item.oldPrice ?? item.originalPrice ?? null;
      
      // 2. Rabatt dynamisch berechnen, falls nicht von API geliefert
      let discountPercent = item.discountPercentage ?? item.discount ?? 0;
      if (!discountPercent && originalPrice && originalPrice > dealPrice) {
        discountPercent = Math.round(((originalPrice - dealPrice) / originalPrice) * 100);
      }

      // 3. Titel bereinigen
      const rawCombined = `${item.title || ''} ${item.name || ''}`;
      const { title: cleanTitle, subtitle } = sanitizeProductTitle(rawCombined, item.brand);

      // 4. App-Exklusivität taggen
      const isAppExclusive = detectAppExclusivity(`${rawCombined} ${item.description || ''}`);

      // 5. Fallback-Bild
      const imageUrl = item.imageUrl || item.image || 'https://placehold.co/300x300.png?text=Kein+Bild';

      // Datums-Formatierung, falls validTo vorhanden ist
      let validityText = 'Diese Woche';
      if (item.validTo) {
        const d = new Date(item.validTo);
        if (!isNaN(d.getTime())) {
          validityText = `Bis ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`;
        } else {
          validityText = `Bis ${item.validTo}`;
        }
      }

      return {
        id: String(item.id),
        storeId: item.storeId || 'unknown',
        storeName: item.storeName || 'Supermarkt',
        cleanTitle,
        subtitle,
        imageUrl,
        dealPrice,
        originalPrice,
        discountPercent,
        isAppExclusive,
        validityText,
        category: item.category || 'Standard',
      };
    });
}
