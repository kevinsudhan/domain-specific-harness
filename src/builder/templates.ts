/**
 * Template routing.
 *
 * A template is a vertical the builder already understands: its vocabulary, its lifecycle,
 * its policy defaults, and the capability modules it needs. Routing a request to one is
 * what lets the gap analyser be deterministic — it can only reason about entities and
 * states it has names for.
 *
 * This is the mechanism docs/ORCHESTRATION-AGENT-PLAN.md describes. The plan's sequence
 * was: extract freight into config, then hand-write further verticals by hand, then
 * generate. Steps one and two are done — every template below is a real `VerticalConfig`
 * the kernel can run, validated by the same `validateVertical()` that checks freight, and
 * none of them required a line of kernel change to accept.
 *
 * That is the claim worth making, and the only one made here: the twin's state machine and
 * the policy gate do not know what business they are serving. Eleven lifecycles as
 * different as a container sailing, a court filing and a dental recall run on the same
 * fixed code, because a vertical is data.
 *
 * `ready` is kept on the interface even though every entry is currently true. It is the
 * honest way to add a twelfth: declare it, leave it false while it is being written, and
 * `pick()` will name it as matched-but-not-built rather than routing a real request into
 * a half-finished lifecycle.
 */
import type { BusinessSpec } from "./spec.js";
import type { VerticalConfig } from "../verticals/types.js";
import { freight } from "../verticals/freight.js";
import { recruitment } from "../verticals/recruitment.js";
import { dental } from "../verticals/dental.js";
import { salon } from "../verticals/salon.js";
import { gym } from "../verticals/gym.js";
import { repair } from "../verticals/repair.js";
import { legal } from "../verticals/legal.js";
import { realestate } from "../verticals/realestate.js";
import { tutoring } from "../verticals/tutoring.js";
import { catering } from "../verticals/catering.js";
import { veterinary } from "../verticals/veterinary.js";

export interface Template {
  id: string;
  label: string;
  /** False means declared but not built. pick() will not route to it. */
  ready: boolean;
  /** Words that indicate this vertical. Matched against the request and the spec. */
  vocabulary: string[];
  /** The lifecycle states, in order. The digital twin's config for this vertical. */
  lifecycle: string[];
  /** Actions that always need a human here, whatever the amount. */
  alwaysApprove: string[];
  /**
   * Domain computation this vertical needs that cannot be expressed as config.
   * The plan's "capability module" limit, written down per template.
   */
  capabilityModules: string[];
  /**
   * What the business calls a thing, mapped to what the deployed schema calls it.
   *
   * Without this the gap analyser matches on names and proposes creating a `shipment`
   * table on a system whose shipment table is called `real_records` — the single most
   * expensive verdict it can get wrong, because rebuilding an entity that already holds
   * live rows is both the largest piece of work in a plan and entirely unnecessary.
   *
   * These are deployment facts, so they belong to the template rather than to the model:
   * a model asked to guess them will guess plausibly and be wrong in a way nobody
   * notices until the CREATE runs.
   */
  entityAliases: Record<string, string>;
  note?: string;
}

/**
 * A template read straight off a vertical's config.
 *
 * The freight template used to carry its own copy of the lifecycle and the always-approve
 * list, which is two sources of truth for the same state machine — the builder would have
 * planned against one while the twin enforced the other, and nothing would have noticed
 * the day they drifted. Deriving it means the builder reads the config the kernel runs on.
 */
function fromVertical(v: VerticalConfig): Template {
  return {
    id: v.id,
    label: v.label,
    ready: true,
    vocabulary: v.builder.vocabulary,
    lifecycle: [...v.lifecycle.order],
    alwaysApprove: Object.keys(v.policy.alwaysApprove),
    capabilityModules: v.builder.capabilityModules,
    entityAliases: v.builder.entityAliases,
  };
}

/**
 * The registry.
 *
 * Ordered with freight first because it is the one deployed against a live desk and so
 * the one whose entityAliases are real deployment facts rather than defaults. The rest
 * are ordered by how far their lifecycle sits from freight's, which is roughly how useful
 * they are as evidence that the kernel is not secretly a logistics kernel.
 */
export const TEMPLATES: Template[] = [
  fromVertical(freight),
  fromVertical(recruitment),
  fromVertical(dental),
  fromVertical(veterinary),
  fromVertical(legal),
  fromVertical(realestate),
  fromVertical(catering),
  fromVertical(repair),
  fromVertical(gym),
  fromVertical(salon),
  fromVertical(tutoring),
];

export interface Routing {
  template: Template | null;
  /** 0–1. How much of the request's vocabulary the template accounts for. */
  confidence: number;
  why: string;
  /** Templates that matched but are not built. Named so the gap is visible. */
  matchedButNotReady: string[];
}

function haystack(spec: BusinessSpec): string {
  return [
    spec.request,
    spec.summary,
    ...spec.entities.map((e) => `${e.name} ${e.purpose}`),
    ...spec.workflows.map((w) => w.name),
    ...spec.agents.map((a) => `${a.name} ${a.purpose}`),
    ...spec.knowledgeDomains,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Picks the template for a request.
 *
 * Returns null rather than a default when nothing matches well. A wrong template is worse
 * than none: it gives the gap analyser a lifecycle and a vocabulary from another business,
 * and every verdict downstream inherits that mistake while looking perfectly confident.
 *
 * `templates` defaults to the real registry and exists so the refusal paths stay testable.
 * Every shipped template is `ready: true`, so without a seam the `ready: false` branch
 * could only be covered by keeping a deliberately broken template in production — which
 * is a worse trade than one optional parameter.
 */
export function pick(spec: BusinessSpec, floor = 0.08, templates: Template[] = TEMPLATES): Routing {
  const hay = haystack(spec);
  const notReady: string[] = [];

  let best: { t: Template; hits: string[] } | null = null;

  for (const t of templates) {
    const hits = t.vocabulary.filter((v) => hay.includes(v));
    if (!hits.length) continue;
    if (!t.ready) {
      notReady.push(t.id);
      continue;
    }
    if (!best || hits.length > best.hits.length) best = { t, hits };
  }

  if (!best) {
    return {
      template: null,
      confidence: 0,
      why: notReady.length
        ? `the request looks like ${notReady.join(", ")}, which is declared but not built`
        : "no template's vocabulary appears in the request",
      matchedButNotReady: notReady,
    };
  }

  const confidence = best.hits.length / best.t.vocabulary.length;
  if (confidence < floor) {
    return {
      template: null,
      confidence,
      why: `only ${best.hits.length} ${best.t.id} term${best.hits.length === 1 ? "" : "s"} appear (${best.hits.join(", ")}) — too thin to route on`,
      matchedButNotReady: notReady,
    };
  }

  return {
    template: best.t,
    confidence,
    why: `matched ${best.hits.length} ${best.t.id} terms: ${best.hits.slice(0, 6).join(", ")}`,
    matchedButNotReady: notReady,
  };
}

export function byId(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
