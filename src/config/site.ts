/**
 * Business details used by the site. Items marked TODO are placeholders.
 * Copy placeholders shown on the page itself are in [brackets], styled in gold,
 * exactly as in the Claude Design file. Replace them before launch.
 */
export const site = {
  name: "Crystal Clean",
  url: "https://www.crystalclean.example", // TODO: real domain
  phoneE164: "+19297669288",
  phoneDisplay: "(929) 766-9288",
  instagram: "crystalclean.fl",
  /** Shown in the "Service area" section and in the search-engine data. */
  cities: [
    "Orlando", "Winter Park", "Kissimmee", "Lake Nona", "Windermere", "Dr. Phillips",
    "Four Corners", "Clermont", "Davenport", "ChampionsGate", "Celebration", "Lake Buena Vista",
    "Winter Garden", "Ocoee", "St. Cloud", "Apopka", "Altamonte Springs", "Maitland",
    "Oviedo", "Sanford", "Lake Mary", "Longwood", "Casselberry", "Winter Springs",
    "Hunters Creek", "Horizon West", "Baldwin Park", "Conway", "Belle Isle", "MetroWest",
  ],
};

/** ZIPs we serve: anything starting with these (Orlando, Seminole, Osceola, Clermont area)... */
export const zipPrefixes = ["327", "328", "347"];
/** ...plus Davenport, Four Corners and ChampionsGate, which use Polk County 338xx ZIPs. */
export const extraZips = ["33837", "33896", "33897"];

export const isZipValid = (zip: string) => /^\d{5}$/.test(zip);
export const isInServiceArea = (zip: string) => isZipValid(zip) && (zipPrefixes.some((p) => zip.startsWith(p)) || extraZips.includes(zip));

/** "Text us" links open a text message to the business number. */
export const textUsHref = `sms:${site.phoneE164}`;
export const callHref = `tel:${site.phoneE164}`;

/** Shared with the quote page: answers carried over from the landing page. */
export const STORAGE_KEY = "cc-quote-v1";
