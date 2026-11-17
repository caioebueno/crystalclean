/**
 * Business details used by the site.
 */
export const site = {
  name: "Crystal Clean",
  /** Public address of the site. Set NEXT_PUBLIC_SITE_URL in Vercel when you move to a custom domain. */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://crystalcleanorlando.vercel.app").replace(/\/$/, ""),
  phoneE164: "+19297669288",
  phoneDisplay: "(929) 766-9288",
  instagram: "crystalclean.fl",
  /** Shown in the "Service area" section and in the search-engine data. Everything within about 1 hour of Four Corners. */
  cities: [
    "Orlando", "Winter Park", "Kissimmee", "Lake Nona", "Windermere", "Dr. Phillips",
    "Four Corners", "Clermont", "Davenport", "ChampionsGate", "Reunion", "Celebration", "Lake Buena Vista",
    "Poinciana", "St. Cloud", "Winter Garden", "Ocoee", "Minneola", "Groveland", "Mount Dora",
    "Apopka", "Altamonte Springs", "Maitland", "Oviedo", "Sanford", "Lake Mary", "Longwood",
    "Casselberry", "Winter Springs", "Hunters Creek", "Horizon West", "Baldwin Park", "Conway", "Belle Isle", "MetroWest",
    "Haines City", "Lakeland", "Winter Haven", "Lake Wales", "Auburndale", "Bartow", "Lake Alfred", "Polk City",
  ],
};

/**
 * Service area: within about 1 hour's drive of Four Corners.
 * Orange, Seminole, Osceola and Lake County ZIPs start with 327, 328 or 347.
 * Polk County uses 338xx; only the towns within about an hour are listed (not Sebring, Avon Park or Frostproof).
 */
export const zipPrefixes = ["327", "328", "347"];
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
export const extraZips = [
  ...range(33801, 33815), // Lakeland
  "33823", // Auburndale
  "33827", // Babson Park
  "33830", // Bartow
  "33837", // Davenport
  "33838", // Dundee
  "33839", // Eagle Lake
  "33844", "33845", // Haines City
  "33849", // Kathleen
  "33850", // Lake Alfred
  "33851", // Lake Hamilton
  "33853", "33859", // Lake Wales
  "33868", // Polk City
  ...range(33880, 33884), // Winter Haven
  "33896", "33897", "33898", // Four Corners, ChampionsGate, Reunion
];

export const isZipValid = (zip: string) => /^\d{5}$/.test(zip);
export const isInServiceArea = (zip: string) => isZipValid(zip) && (zipPrefixes.some((p) => zip.startsWith(p)) || extraZips.includes(zip));

/** "Text us" links open a text message to the business number. */
export const textUsHref = `sms:${site.phoneE164}`;
export const whatsappHref = `https://wa.me/${site.phoneE164.slice(1)}`;
export const callHref = `tel:${site.phoneE164}`;

/** Shared with the quote page: answers carried over from the landing page. */
export const STORAGE_KEY = "cc-quote-v2";
