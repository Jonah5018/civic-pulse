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
