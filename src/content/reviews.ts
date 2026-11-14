/**
 * Real customer reviews, confirmed by the owner. Keep the text word for word.
 * Newest first. Add new ones at the top.
 */
export type Review = { name: string; date: string; city: string; text: string };

export const reviews: Review[] = [
  {
    name: "Sarah Johnson",
    date: "November 2026",
    city: "Orlando, FL",
    text: "Super happy with the results! Scheduling was simple, the cleaners arrived right on time, and they did a wonderful job. It's such a relief coming home to a clean house.",
  },
  {
    name: "Robert Anderson",
    date: "September 2026",
    city: "Orlando, FL",
    text: "Very good experience overall. The team was respectful, efficient, and did a great job cleaning our office. Communication was clear and the pricing was reasonable. Will book again.",
  },
  {
    name: "David Wilson",
    date: "August 2026",
    city: "Orlando, FL",
    text: "Excellent move-out cleaning service. They took care of the floors, appliances, cabinets, and bathrooms. The apartment looked fantastic when they finished. Would definitely use them again.",
  },
];
