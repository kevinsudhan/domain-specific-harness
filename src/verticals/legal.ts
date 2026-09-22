/**
 * Law firm — matter management from first enquiry to file closure.
 *
 * This vertical is the strongest test of the policy gate, because almost nothing a law
 * firm does is safe to automate. Conflict checks, client-money movements and anything
 * filed at a court are all absolute holds regardless of amount — which is the case the
 * gate was designed for and the reason alwaysApprove exists separately from thresholds.
 *
 * Client money deserves the explicit note: it is held on trust and is not the firm's.
 * Moving it is never an operational decision, so the threshold on it is not a limit but a
 * flat hold.
 */
import { defineVertical } from "./types.js";

export const legal = defineVertical({
  id: "legal",
  label: "Law firm",

  business: {
    name: "Legal practice",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: [
      "enquiry", "conflict_check", "engaged", "in_progress",
      "hearing", "settlement", "billing", "closed",
    ],
    initial: "enquiry",
    states: {
      enquiry: {
        label: "Enquiry",
        requirements: ["client name", "matter type", "opposing party"],
        actions: ["record_enquiry", "assess_merits", "notify_client"],
        next: ["conflict_check"],
      },
      conflict_check: {
        label: "Conflict check",
        requirements: ["parties screened", "no conflict recorded"],
        actions: ["run_conflict_check", "verify_identity", "notify_client"],
        next: ["engaged"],
      },
      engaged: {
        label: "Engaged",
        requirements: ["engagement letter signed", "scope agreed", "fee basis agreed"],
        actions: ["issue_engagement_letter", "agree_fee", "take_retainer", "notify_client"],
        next: ["in_progress"],
      },
      in_progress: {
        label: "In progress",
        requirements: ["matter open"],
        actions: ["record_time", "draft_document", "request_document", "file_court_document", "instruct_counsel", "notify_client"],
        next: ["hearing", "settlement"],
      },
      hearing: {
        label: "Hearing",
        requirements: ["hearing date listed"],
        actions: ["record_time", "instruct_counsel", "file_court_document", "notify_client"],
        next: ["settlement", "in_progress"],
      },
      settlement: {
        label: "Settlement",
        requirements: ["terms agreed in writing"],
        actions: ["draft_document", "release_client_funds", "record_time", "notify_client"],
        next: ["billing"],
      },
      billing: {
        label: "Billing",
        requirements: ["time recorded", "disbursements captured"],
        actions: ["raise_invoice", "issue_payment_link", "release_client_funds", "notify_client"],
        next: ["closed"],
      },
      closed: {
        label: "Closed",
        requirements: ["file reviewed for retention"],
        actions: ["archive_matter", "chase_balance", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "record_enquiry", "assess_merits", "run_conflict_check", "verify_identity",
    "issue_engagement_letter", "agree_fee", "take_retainer",
    "record_time", "draft_document", "request_document",
    "file_court_document", "instruct_counsel",
    "raise_invoice", "issue_payment_link", "release_client_funds",
    "archive_matter", "chase_balance", "notify_client", "close_file",
  ],

  policy: {
    alwaysApprove: {
      run_conflict_check: { why: "a conflict determination is a regulatory decision", approver: "compliance" },
      verify_identity: { why: "client due diligence is a regulatory obligation", approver: "compliance" },
      file_court_document: { why: "a court filing binds the client", approver: "compliance" },
      instruct_counsel: { why: "instructing counsel commits the client to a cost", approver: "desk" },
      // Client money is held on trust. No threshold makes moving it routine.
      release_client_funds: { why: "client funds are held on trust and are not the firm's", approver: "finance" },
      archive_matter: { why: "files have a statutory retention period", approver: "compliance" },
    },
    thresholds: [
      { actions: ["raise_invoice", "issue_payment_link"], measure: "amount", limit: 100_000, trigger: "atOrAbove", approver: "finance" },
      { actions: ["agree_fee"], measure: "discountPct", limit: 10, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "matter", "client", "counsel", "hearing", "court", "filing", "conflict check",
      "engagement letter", "retainer", "disbursement", "settlement", "litigation",
      "solicitor", "advocate", "case", "brief", "time entry", "billable",
    ],
    entityAliases: {},
    capabilityModules: [
      "conflict-of-interest screening across parties",
      "time recording and billable-rate arithmetic",
    ],
  },
});
