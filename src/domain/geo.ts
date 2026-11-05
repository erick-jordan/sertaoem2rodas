import type { GeoPoint, Place, UF } from './types';

/**
 * Coordenadas das sedes municipais usadas no protótipo.
 * Em produção: tabela completa dos municípios do IBGE com latitude/longitude,
 * carregada uma vez no Firestore (coleção `cities`), usada no cadastro e no
 * cálculo de "quem veio de mais longe". Nunca usamos a localização do celular.
 */
const CIDADES: Record<string, [number, number]> = {
  'João Pessoa/PB': [-7.115, -34.863], 'Campina Grande/PB': [-7.23, -35.881],
  'Patos/PB': [-7.024, -37.28], 'Sousa/PB': [-6.759, -38.231], 'Cajazeiras/PB': [-6.889, -38.557],
  'Monteiro/PB': [-7.889, -37.12], 'Pombal/PB': [-6.77, -37.802], 'Cabedelo/PB': [-6.981, -34.834],
  'Guarabira/PB': [-6.855, -35.49], 'Mamanguape/PB': [-6.839, -35.126], 'Itabaiana/PB': [-7.328, -35.332],
  'Conceição/PB': [-7.562, -38.509], 'Princesa Isabel/PB': [-7.737, -37.993], 'Santa Luzia/PB': [-6.872, -36.918],
  'Recife/PE': [-8.047, -34.877], 'Caruaru/PE': [-8.283, -35.976], 'Garanhuns/PE': [-8.89, -36.493],
  'Petrolina/PE': [-9.389, -40.503], 'Ipojuca/PE': [-8.4, -35.064], 'Pesqueira/PE': [-8.358, -36.696],
  'Olinda/PE': [-8.008, -34.855], 'Santa Cruz do Capibaribe/PE': [-7.957, -36.204], 'Serra Talhada/PE': [-7.986, -38.297],
  'Natal/RN': [-5.794, -35.211], 'Mossoró/RN': [-5.188, -37.344], 'Caicó/RN': [-6.458, -37.097],
  'Currais Novos/RN': [-6.26, -36.517], 'São Paulo do Potengi/RN': [-5.894, -35.763], 'Santa Cruz/RN': [-6.229, -36.022],
  'Fortaleza/CE': [-3.732, -38.527], 'Juazeiro do Norte/CE': [-7.213, -39.315], 'Crato/CE': [-7.234, -39.409],
  'Brejo Santo/CE': [-7.493, -38.985], 'Sobral/CE': [-3.689, -40.349], 'Paracuru/CE': [-3.41, -39.03],
  'Ubajara/CE': [-3.854, -40.921], 'Iguatu/CE': [-6.361, -39.298],
  'Maceió/AL': [-9.665, -35.735], 'Arapiraca/AL': [-9.752, -36.661], 'Penedo/AL': [-10.29, -36.586],
  'Aracaju/SE': [-10.947, -37.073], 'Itabaiana/SE': [-10.685, -37.425],
  'Salvador/BA': [-12.971, -38.501], 'Feira de Santana/BA': [-12.267, -38.966], 'Paulo Afonso/BA': [-9.406, -38.214],
  'Vitória da Conquista/BA': [-14.866, -40.839], 'Juazeiro/BA': [-9.416, -40.503], 'Irecê/BA': [-11.304, -41.856],
  'Jequié/BA': [-13.858, -40.084], 'Morro do Chapéu/BA': [-11.549, -41.157],
  'Teresina/PI': [-5.089, -42.802], 'Parnaíba/PI': [-2.904, -41.776], 'Picos/PI': [-7.077, -41.467],
  'São Luís/MA': [-2.53, -44.303], 'Imperatriz/MA': [-5.526, -47.478], 'Caxias/MA': [-4.858, -43.356],
  'Barreirinhas/MA': [-2.747, -42.826],
};

export const CIDADES_DISPONIVEIS = Object.keys(CIDADES).sort((a, b) => a.localeCompare(b, 'pt-BR'));

export function cityGeo(city: string, uf: UF | string): GeoPoint | undefined {
  const c = CIDADES[`${city}/${uf}`];
  return c ? { lat: c[0], lng: c[1] } : undefined;
}

/** Distância em linha reta (Haversine), em km. Boa o bastante para premiar "quem veio de mais longe". */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Links "Como chegar": vão ao pino marcado; sem pino, ao centro da cidade. */
export function directionsLinks(place: Pick<Place, 'geo' | 'address' | 'name'> | undefined, city: string, uf: string) {
  if (place?.geo) {
    const { lat, lng } = place.geo;
    return {
      google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      exact: true,
    };
  }
  const q = encodeURIComponent(`${city} - ${uf}, Brasil`);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
    exact: false,
  };
}
