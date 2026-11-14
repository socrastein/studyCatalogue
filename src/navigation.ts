/** One link of the main navigation. */
export type NavLink = { name: string; path: string };

/**
 * The main navigation's links, in order: the header shows them in a row on wider screens, and the phone menu
 * (`components/PhoneMenu.vue`) lists them in its panel. Each `name` matches the heading of the page it opens, apart
 * from the review link, which adds a count (see `navLinks`).
 */
export const NAV_LINKS: readonly NavLink[] = [
  { name: "Studies", path: "/" },
  { name: "Add a Study", path: "/studies/new" },
  { name: "Tags", path: "/tags" },
  { name: "Settings", path: "/settings" },
];

/**
 * The links to show now: the main ones, with "Review Summaries" before Settings while drafts wait for review, and its
 * count after the name so the number is there before the page is opened. With none waiting there is no such link.
 *
 * @param waitingCount How many studies have a draft summary awaiting review.
 */
export function navLinks(waitingCount: number): readonly NavLink[] {
  if (waitingCount === 0) return NAV_LINKS;
  const reviewLink = {
    name: `Review Summaries (${waitingCount})`,
    path: "/review",
  };
  const beforeSettings = NAV_LINKS.slice(0, -1);
  const settings = NAV_LINKS.slice(-1);
  return [...beforeSettings, reviewLink, ...settings];
}

/**
 * Widths at which the header swaps its row of links for the phone menu: under 768px the links and the theme button
 * no longer fit on one line beside the site name. The same breakpoint as liftingApp's header.
 */
export const PHONE_WIDTH_QUERY = "(max-width: 767px)";
