/*
 * The main navigation's links and the phone breakpoint, shared by the header (App.vue) and the phone menu
 * (components/PhoneMenu.vue). Plain data and functions with no Vue, so the link rules are tested in Node (navigation.test.ts).
 */

/** One link of the main navigation. */
export type NavLink = { name: string; path: string };

/**
 * The main navigation's links, in order: the header shows them in a row on wider screens, and the phone menu
 * (`components/PhoneMenu.vue`) lists them in its panel. Each `name` is a short form of its page's heading (the Add
 * link opens "Add a Study", the Review link "Review Summaries"), kept short so the row fits; the review link also adds
 * a count (see `navLinks`).
 */
export const NAV_LINKS: readonly NavLink[] = [
  { name: "Studies", path: "/" },
  { name: "Add", path: "/studies/new" },
  { name: "Tags", path: "/tags" },
  { name: "Fetch", path: "/fetch" },
  { name: "Settings", path: "/settings" },
];

/**
 * The links to show now: the main ones, with "Review" before Settings while drafts wait for review, and its count
 * after the name so the number is there before the page is opened. With none waiting there is no such link.
 *
 * @param waitingCount How many studies have a draft summary awaiting review.
 */
export function navLinks(waitingCount: number): readonly NavLink[] {
  if (waitingCount === 0) return NAV_LINKS;
  const reviewLink = {
    name: `Review (${waitingCount})`,
    path: "/review",
  };
  // Settings is the last main link, so the review link goes in just before it
  const beforeSettings = NAV_LINKS.slice(0, -1);
  const settings = NAV_LINKS.slice(-1);
  return [...beforeSettings, reviewLink, ...settings];
}

/**
 * The widest screen, in CSS pixels, that gets the phone menu. At 768px the links and the theme button no longer fit on one
 * line beside the site name, so the menu takes over one pixel below that. The same breakpoint as liftingApp's header.
 */
const PHONE_MAX_WIDTH_PX = 767;

/**
 * The media query that is true at phone widths: App.vue passes it to `useMediaQuery` to swap the header's row of links
 * for the phone menu.
 */
export const PHONE_WIDTH_QUERY = `(max-width: ${PHONE_MAX_WIDTH_PX}px)`;
