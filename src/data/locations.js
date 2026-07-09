// Verified administrative data for the five South-East Nigeria states this
// pilot covers. LGA lists are sourced from state government / INEC records.
// Ward-level data is intentionally NOT hard-coded for every LGA — real ward
// boundaries run into the hundreds and change with delimitation exercises.
// Instead:
//   1. A handful of real wards are seeded here (and in supabase/schema.sql)
//      for Umuahia North / Umuahia South as a working example.
//   2. The Home form tries to load wards for the chosen LGA from the
//      Supabase `wards` table first.
//   3. If none are found, it falls back to a free-text "ward / area" field
//      so reporting is never blocked on missing seed data.

export const STATES = ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"];

export const LGAS_BY_STATE = {
  Abia: [
    "Aba North",
    "Aba South",
    "Arochukwu",
    "Bende",
    "Ikwuano",
    "Isiala Ngwa North",
    "Isiala Ngwa South",
    "Isuikwuato",
    "Obi Ngwa",
    "Ohafia",
    "Osisioma Ngwa",
    "Ugwunagbo",
    "Ukwa East",
    "Ukwa West",
    "Umuahia North",
    "Umuahia South",
    "Umunneochi",
  ],
  Anambra: [
    "Aguata",
    "Anambra East",
    "Anambra West",
    "Anaocha",
    "Awka North",
    "Awka South",
    "Ayamelum",
    "Dunukofia",
    "Ekwusigo",
    "Idemili North",
    "Idemili South",
    "Ihiala",
    "Njikoka",
    "Nnewi North",
    "Nnewi South",
    "Ogbaru",
    "Onitsha North",
    "Onitsha South",
    "Orumba North",
    "Orumba South",
    "Oyi",
  ],
  Ebonyi: [
    "Abakaliki",
    "Afikpo North",
    "Afikpo South",
    "Ebonyi",
    "Ezza North",
    "Ezza South",
    "Ikwo",
    "Ishielu",
    "Ivo",
    "Izzi",
    "Ohaozara",
    "Ohaukwu",
    "Onicha",
  ],
  Enugu: [
    "Aninri",
    "Awgu",
    "Enugu East",
    "Enugu North",
    "Enugu South",
    "Ezeagu",
    "Igbo Etiti",
    "Igbo Eze North",
    "Igbo Eze South",
    "Isi Uzo",
    "Nkanu East",
    "Nkanu West",
    "Nsukka",
    "Oji River",
    "Udenu",
    "Udi",
    "Uzo-Uwani",
  ],
  Imo: [
    "Aboh Mbaise",
    "Ahiazu Mbaise",
    "Ehime Mbano",
    "Ezinihitte Mbaise",
    "Ideato North",
    "Ideato South",
    "Ihitte/Uboma",
    "Ikeduru",
    "Isiala Mbano",
    "Isu",
    "Mbaitoli",
    "Ngor Okpala",
    "Njaba",
    "Nkwerre",
    "Nwangele",
    "Obowo",
    "Oguta",
    "Ohaji/Egbema",
    "Okigwe",
    "Onuimo",
    "Orlu",
    "Orsu",
    "Oru East",
    "Oru West",
    "Owerri Municipal",
    "Owerri North",
    "Owerri West",
  ],
};

// Real INEC electoral wards, seeded for a couple of LGAs so the cascading
// dropdown has genuine data to demonstrate end to end. Everything else is
// meant to be topped up in the `wards` table (see supabase/schema.sql).
export const SEED_WARDS = {
  "Umuahia North": [
    "Afugiri",
    "Ibeku East I",
    "Ibeku East II",
    "Ibeku West",
    "Isingwu",
    "Ndume",
    "Nkwoachara",
    "Nkwoegwu",
    "Umuahia Urban I",
    "Umuahia Urban II",
    "Umuahia Urban III",
    "Umuhu",
  ],
};

// Approximate geographic centers (lat, lng) for each state and LGA. Used as a
// geocoding fallback so reports submitted without exact GPS coordinates still
// get a pin on the incident map — dropped at the center of the report's LGA
// (or state). Coordinates are centroids, good enough for visualization.
export const STATE_CENTERS = {
  Abia: [5.4527, 7.5248],
  Anambra: [6.2109, 7.0674],
  Ebonyi: [6.4012, 8.1083],
  Enugu: [6.5244, 7.5182],
  Imo: [5.4969, 7.0499],
};

export const LGA_CENTERS = {
  // Abia
  "Aba North": [5.1348, 7.3765],
  "Aba South": [5.1066, 7.3579],
  Arochukwu: [5.3992, 7.902],
  Bende: [5.5505, 7.6536],
  Ikwuano: [5.4501, 7.5543],
  "Isiala Ngwa North": [5.3011, 7.4502],
  "Isiala Ngwa South": [5.2203, 7.421],
  Isuikwuato: [5.6548, 7.6208],
  "Obi Ngwa": [5.1822, 7.4016],
  Ohafia: [5.6207, 7.7801],
  "Osisioma Ngwa": [5.1809, 7.4211],
  Ugwunagbo: [5.1016, 7.4003],
  "Ukwa East": [4.9486, 7.3005],
  "Ukwa West": [5.0037, 7.2523],
  "Umuahia North": [5.5505, 7.5033],
  "Umuahia South": [5.4803, 7.5322],
  Umunneochi: [5.7236, 7.5822],
  // Anambra
  Aguata: [6.0548, 7.3837],
  "Anambra East": [6.3025, 6.852],
  "Anambra West": [6.4019, 6.7014],
  Anaocha: [6.1522, 7.0514],
  "Awka North": [6.3225, 7.1804],
  "Awka South": [6.2037, 7.1037],
  Ayamelum: [6.422, 7.2518],
  Dunukofia: [6.2524, 7.1505],
  Ekwusigo: [6.0526, 6.952],
  "Idemili North": [6.1027, 6.9829],
  "Idemili South": [6.0204, 6.9207],
  Ihiala: [5.9229, 6.8523],
  Njikoka: [6.1823, 7.0819],
  "Nnewi North": [6.0205, 6.8804],
  "Nnewi South": [5.952, 6.8513],
  Ogbaru: [5.7806, 6.7804],
  "Onitsha North": [6.1722, 6.8011],
  "Onitsha South": [6.1211, 6.8213],
  "Orumba North": [6.1026, 7.302],
  "Orumba South": [6.0207, 7.3321],
  Oyi: [6.2823, 7.0517],
  // Ebonyi
  Abakaliki: [6.3211, 8.1013],
  "Afikpo North": [6.0207, 8.0316],
  "Afikpo South": [5.9013, 8.0522],
  Ebonyi: [6.3022, 8.2019],
  "Ezza North": [6.4025, 8.0827],
  "Ezza South": [6.2523, 8.0524],
  Ikwo: [6.1826, 8.2028],
  Ishielu: [6.452, 8.0525],
  Ivo: [6.0529, 8.1011],
  Izzi: [6.3724, 8.0522],
  Ohaozara: [6.1025, 8.0019],
  Ohaukwu: [6.5222, 8.1226],
  Onicha: [6.1523, 8.1521],
  // Enugu
  Aninri: [6.0525, 7.4522],
  Awgu: [6.0827, 7.4825],
  "Enugu East": [6.4722, 7.5526],
  "Enugu North": [6.5026, 7.5223],
  "Enugu South": [6.4022, 7.5024],
  Ezeagu: [6.3524, 7.4222],
  "Igbo Etiti": [6.6221, 7.4025],
  "Igbo Eze North": [6.7823, 7.5526],
  "Igbo Eze South": [6.7025, 7.5022],
  "Isi Uzo": [6.8528, 7.6228],
  "Nkanu East": [6.5027, 7.6223],
  "Nkanu West": [6.4525, 7.4522],
  Nsukka: [6.8628, 7.4027],
  "Oji River": [6.3026, 7.4224],
  Udenu: [6.9225, 7.6027],
  Udi: [6.3824, 7.4826],
  "Uzo-Uwani": [7.0229, 7.5026],
  // Imo
  "Aboh Mbaise": [5.5527, 7.1828],
  "Ahiazu Mbaise": [5.6226, 7.2225],
  "Ehime Mbano": [5.7224, 7.2027],
  "Ezinihitte Mbaise": [5.5825, 7.2522],
  "Ideato North": [5.8529, 7.0526],
  "Ideato South": [5.8024, 7.1029],
  "Ihitte/Uboma": [5.6828, 7.1525],
  Ikeduru: [5.5027, 7.0827],
  "Isiala Mbano": [5.7825, 7.1228],
  Isu: [5.6527, 7.2024],
  Mbaitoli: [5.6029, 7.0226],
  "Ngor Okpala": [5.4027, 7.1025],
  Njaba: [5.7524, 7.0527],
  Nkwerre: [5.8226, 7.0827],
  Nwangele: [5.8024, 7.0029],
  Obowo: [5.7026, 7.1528],
  Oguta: [5.7228, 6.8027],
  "Ohaji/Egbema": [5.5524, 6.7826],
  Okigwe: [5.8229, 7.3527],
  Onuimo: [5.8828, 7.3026],
  Orlu: [5.8029, 7.0524],
  Orsu: [5.7828, 7.0027],
  "Oru East": [5.5024, 7.0026],
  "Oru West": [5.5527, 6.9528],
  "Owerri Municipal": [5.4826, 7.0229],
  "Owerri North": [5.5527, 7.0026],
  "Owerri West": [5.4525, 6.9828],
};

// Deterministic tiny offset so multiple reports in the same LGA (which share
// one center) don't stack into a single pin. Derived from the ward name.
function jitterFor(key) {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  const latOff = ((h % 1000) / 1000 - 0.5) * 0.05;
  const lngOff = (((h >> 10) % 1000) / 1000 - 0.5) * 0.05;
  return [latOff, lngOff];
}

/**
 * Resolve a [lat, lng] for a report. Uses the exact GPS coordinates when
 * present, otherwise falls back to the center of the report's LGA (or state),
 * jittered slightly per ward so pins don't overlap exactly.
 *
 * Returns { coords, approximate } so callers can label approximate pins.
 */
export function getReportCoords(report) {
  if (report.latitude != null && report.longitude != null) {
    return { coords: [report.latitude, report.longitude], approximate: false };
  }
  const base =
    (report.lga && LGA_CENTERS[report.lga]) ||
    (report.state && STATE_CENTERS[report.state]) || [6.2109, 7.0674];
  const [dLat, dLng] = jitterFor(report.ward || report.lga || report.id || "");
  return {
    coords: [base[0] + dLat, base[1] + dLng],
    approximate: true,
  };
}

