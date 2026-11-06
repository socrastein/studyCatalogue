/**
 * The tags a new catalogue starts with: the subjects and subfields of the original category list, each subfield a
 * child of its subject. They are ordinary tags afterwards, free to rename, merge or delete in the tag manager.
 *
 * Seed tags get readable fixed ids ("nutrition", "nutrition/protein") instead of random ones, so the same seed tag
 * has the same id in every catalogue, and subfields that share a name under different subjects stay distinct.
 */
import type { Tag } from "./tags";

/** Each starting subject and its subfields, in display order. */
const SEED_TOPICS = [
  {
    subject: "Exercise Science",
    subfields: [
      "General Health",
      "Cardio",
      "Strength",
      "Hypertrophy",
      "Sport Performance",
      "Flexibility",
      "Form & Posture",
      "Pain & Injury",
    ],
  },
  {
    subject: "Nutrition",
    subfields: [
      "Protein",
      "Carbohydrates",
      "Fats",
      "Fiber",
      "Micronutrients",
      "Supplements",
      "Food Additives",
      "Dietary Patterns",
    ],
  },
  {
    subject: "Biology",
    subfields: [
      "Evolution",
      "Genetics",
      "Animal Behavior",
      "Plants & Fungi",
      "Microbiology",
      "Climatology",
    ],
  },
  {
    subject: "Physics",
    subfields: ["Cosmology", "Astronomy", "Relativity", "Particle Physics"],
  },
  {
    subject: "Psychology",
    subfields: [
      "Personality",
      "Politics",
      "Cognitive Bias",
      "Mental Health",
      "Memory & Learning",
      "Neuroscience",
      "Gender & Sexuality",
      "Child Development",
    ],
  },
  {
    subject: "Philosophy",
    subfields: [
      "Ethics",
      "Metaphysics",
      "Consciousness",
      "Free Will",
      "Science",
      "Epistemology",
    ],
  },
];

/**
 * The starting tags: each subject followed by its subfields, in the order above.
 *
 * @returns New tag objects on every call, so changing one catalogue's tags never touches another's.
 */
export function seedTags(): Tag[] {
  return SEED_TOPICS.flatMap(({ subject, subfields }) => {
    const subjectTag = seedTag(subject);
    const subfieldTags = subfields.map((subfield) =>
      seedTag(subfield, subjectTag),
    );
    return [subjectTag, ...subfieldTags];
  });
}

/**
 * One seed tag, its id made from its name and its parent's id: "Form & Posture" under Exercise Science gets
 * "exercise-science/form-posture".
 *
 * @param parent The subject a subfield sits under; none for a subject.
 */
function seedTag(name: string, parent?: Tag): Tag {
  const slug = slugify(name);
  if (parent === undefined)
    return { id: slug, name, parentIds: [], aliases: [] };
  return {
    id: `${parent.id}/${slug}`,
    name,
    parentIds: [parent.id],
    aliases: [],
  };
}

/** A name lowercased, with each run of characters other than letters and digits turned into one hyphen. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
