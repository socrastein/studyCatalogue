/**
 * The main navigation's links, in order, as the header shows them. Each `name` matches the heading of the page it
 * opens.
 */
export const NAV_LINKS = [
  { name: "Studies", path: "/" },
  { name: "Add a study", path: "/studies/new" },
  { name: "Tags", path: "/tags" },
  { name: "Settings", path: "/settings" },
] as const;
