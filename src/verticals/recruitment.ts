/**
 * Recruitment — an agency desk placing candidates with client companies.
 *
 * This is the vertical the template registry used to declare as a stub, and it is
 * deliberately the FIRST one written by hand after freight. The plan's step two was to
 * hand-write a second vertical rather than generate one, because that is where the
 * abstraction either holds or visibly fails. It held: nothing in the kernel changed to
 * accept it, and the same validator that checks freight checks this.
 *
 * What it proved, concretely: the twin's forward-only rule with named backward edges
 * survives a lifecycle that loops (a rejected candidate goes back to shortlisted, not to
 * the start), and the policy gate's "measure" vocabulary — amount, discountPct — turned
 * out to cover a placement fee without widening the type.
 */
import { defineVertical } from "./types.js";

export const recruitment = defineVertical({
  id: "recruitment",
  label: "Recruitment desk",

  business: {
    name: "Placement desk",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  /**
   * The backward edge is interview → shortlisted. A candidate who fails one interview is
   * still a live candidate for the same vacancy; modelling that as a new application
   * would lose the interview history, which is the thing a client asks about.
   */
  lifecycle: {
    order: [
      "brief", "sourcing", "shortlisted", "submitted",
      "interview", "offer", "placed", "invoiced",
    ],
    initial: "brief",
    states: {
      brief: {
        label: "Client brief",
        requirements: ["role title", "salary band", "client contact", "fee agreement signed"],
        actions: ["qualify_role", "agree_fee", "notify_client", "request_document"],
        next: ["sourcing"],
      },
      sourcing: {
        label: "Sourcing",
        requirements: ["search brief agreed"],
        actions: ["source_candidate", "screen_candidate", "notify_candidate", "notify_client"],
        next: ["shortlisted"],
      },
      shortlisted: {
        label: "Shortlisted",
        requirements: ["candidate consent to represent"],
        actions: ["screen_candidate", "right_to_work_check", "notify_candidate", "share_candidate"],
        next: ["submitted"],
      },
      submitted: {
        label: "Submitted to client",
        requirements: ["CV sent", "candidate consent on file"],
        actions: ["share_candidate", "notify_client", "schedule_interview"],
        next: ["interview"],
      },
      interview: {
        label: "Interview",
        requirements: ["interview slot confirmed"],
        actions: ["schedule_interview", "record_feedback", "notify_candidate", "notify_client"],
        next: ["offer", "shortlisted"], // back to shortlisted when an interview fails
      },
      offer: {
        label: "Offer",
        requirements: ["offer terms agreed", "start date agreed"],
        actions: ["send_offer", "negotiate_terms", "notify_candidate", "notify_client"],
        next: ["placed"],
      },
      placed: {
        label: "Placed",
        requirements: ["start date confirmed", "guarantee period noted"],
        actions: ["confirm_start", "raise_invoice", "notify_client"],
        next: ["invoiced"],
      },
      invoiced: {
        label: "Invoiced",
        requirements: [],
        // The rebate equivalent: a candidate who leaves inside the guarantee period means
        // a clawback, and chasing it is book-level work nobody does by hand.
        actions: ["raise_invoice", "issue_payment_link", "process_clawback", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "qualify_role", "agree_fee", "request_document",
    "source_candidate", "screen_candidate", "right_to_work_check",
    "share_candidate", "schedule_interview", "record_feedback",
    "send_offer", "negotiate_terms", "confirm_start",
    "notify_candidate", "notify_client",
    "raise_invoice", "issue_payment_link", "process_clawback", "close_file",
  ],

  policy: {
    alwaysApprove: {
      send_offer: { why: "an offer is a binding commitment to a candidate", approver: "desk" },
      share_candidate: { why: "sharing candidate details is a data-protection decision", approver: "compliance" },
      right_to_work_check: { why: "right-to-work is a compliance determination", approver: "compliance" },
      process_clawback: { why: "a clawback reverses money already invoiced", approver: "finance" },
    },
    thresholds: [
      { actions: ["raise_invoice", "issue_payment_link"], measure: "amount", limit: 100_000, trigger: "atOrAbove", approver: "finance" },
      // Discounting the placement fee below the agreement is a commercial decision.
      { actions: ["agree_fee", "negotiate_terms"], measure: "discountPct", limit: 10, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "candidate", "vacancy", "placement", "interview", "offer", "shortlist",
      "client brief", "recruiter", "cv", "resume", "sourcing", "screening",
      "right to work", "salary", "notice period", "clawback", "guarantee period",
    ],
    entityAliases: {},
    capabilityModules: [
      "right-to-work and document verification",
      "salary benchmarking against a market band",
    ],
  },
});
