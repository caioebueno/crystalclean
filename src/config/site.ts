/**
 * Business details used by the site. Items marked TODO are placeholders.
 * Copy placeholders shown on the page itself are in [brackets], styled in gold,
 * exactly as in the Claude Design file. Replace them before launch.
 */
export const site = {
  name: "Crystal Clean",
  url: "https://www.crystalclean.example", // TODO: real domain
  phoneE164: "+14070000000", // TODO: real business mobile number for "Text us"
  instagram: "crystalclean.fl",
  cities: ["Orlando", "Winter Park", "Kissimmee", "Lake Nona", "Windermere", "Dr. Phillips"],
};

/** TODO: replace with the real service-area ZIP list. Same rule as the design for now. */
export const zipPrefixes = ["327", "328", "347"];

export const isZipValid = (zip: string) => /^\d{5}$/.test(zip);
export const isInServiceArea = (zip: string) => isZipValid(zip) && zipPrefixes.some((p) => zip.startsWith(p));

export const textUsHref = `sms:${site.phoneE164}`;

/** Shared with the quote page: answers carried over from the landing page. */
export const STORAGE_KEY = "cc-quote-v1";
