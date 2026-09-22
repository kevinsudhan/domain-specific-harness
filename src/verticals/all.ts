/**
 * Every vertical that ships, in one list.
 *
 * Exists so that "is this template well-formed" is a question asked of all of them rather
 * than only of the one a deployment happens to be running. A broken lifecycle in a
 * template nobody has switched to yet is still a trap — it just springs later, for
 * someone who did not write it.
 *
 * `active.ts` still picks the single vertical the kernel runs. This list is for the
 * builder (which routes across all of them) and for the tests.
 */
import type { VerticalConfig } from "./types.js";

import { freight } from "./freight.js";
import { recruitment } from "./recruitment.js";
import { dental } from "./dental.js";
import { veterinary } from "./veterinary.js";
import { legal } from "./legal.js";
import { realestate } from "./realestate.js";
import { catering } from "./catering.js";
import { repair } from "./repair.js";
import { gym } from "./gym.js";
import { salon } from "./salon.js";
import { tutoring } from "./tutoring.js";

export const ALL_VERTICALS: VerticalConfig[] = [
  freight,
  recruitment,
  dental,
  veterinary,
  legal,
  realestate,
  catering,
  repair,
  gym,
  salon,
  tutoring,
];

export {
  freight, recruitment, dental, veterinary, legal,
  realestate, catering, repair, gym, salon, tutoring,
};
