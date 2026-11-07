/**
 * The main navigation's links, in order: the header shows them in a row on wider screens, and the phone menu
 * (`components/PhoneMenu.vue`) lists them in its panel. Each `name` matches the heading of the page it opens.
 */
export const NAV_LINKS = [
  { name: "Studies", path: "/" },
  { name: "Add a study", path: "/studies/new" },
  { name: "Tags", path: "/tags" },
  { name: "Settings", path: "/settings" },
] as const;

/**
 * Widths at which the header swaps its row of links for the phone menu: under 768px the links and the theme button
 * no longer fit on one line beside the site name. The same breakpoint as liftingApp's header.
 */
export const PHONE_WIDTH_QUERY = "(max-width: 767px)";
