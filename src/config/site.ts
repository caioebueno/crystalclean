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
export const whatsappHref = `https://wa.me/${site.phoneE164.slice(1)}`;
export const callHref = `tel:${site.phoneE164}`;

/** Shared with the quote page: answers carried over from the landing page. */
export const STORAGE_KEY = "cc-quote-v1";
