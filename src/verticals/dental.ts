/**
 * Dental practice — appointment-led clinical care with a treatment plan behind it.
 *
 * The interesting difference from freight: a patient does not move through the lifecycle
 * once. Multi-visit treatment means in_treatment loops back to scheduled for every
 * subsequent appointment, and the file only closes when the plan is complete. Modelling
 * each visit as its own case would scatter one course of treatment across many records —
 * which is exactly what makes recall and outstanding-balance chasing unreliable.
 *
 * Clinical actions are never autonomous here. That is not a threshold question; no amount
 * of money makes prescribing or a treatment-plan change something a system should do
 * alone, so they sit in alwaysApprove rather than under a limit.
 */
import { defineVertical } from "./types.js";

export const dental = defineVertical({
  id: "dental",
  label: "Dental practice",

  business: {
    name: "Dental practice",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: [
      "enquiry", "scheduled", "consultation", "treatment_plan",
      "in_treatment", "billing", "recall", "closed",
    ],
    initial: "enquiry",
    states: {
      enquiry: {
        label: "Enquiry",
        requirements: ["patient name", "contact number", "reason for visit"],
        actions: ["register_patient", "offer_slot", "notify_patient"],
        next: ["scheduled"],
      },
      scheduled: {
        label: "Appointment scheduled",
        requirements: ["appointment slot confirmed"],
        actions: ["offer_slot", "send_reminder", "reschedule", "notify_patient"],
        next: ["consultation"],
      },
      consultation: {
        label: "Consultation",
        requirements: ["medical history recorded", "consent to examine"],
        actions: ["record_history", "take_xray", "record_findings", "notify_patient"],
        next: ["treatment_plan"],
      },
      treatment_plan: {
        label: "Treatment plan",
        requirements: ["plan explained", "estimate accepted"],
        actions: ["propose_plan", "quote_estimate", "obtain_consent", "notify_patient"],
        next: ["in_treatment"],
      },
      in_treatment: {
        label: "In treatment",
        requirements: ["consent on file"],
        actions: ["perform_procedure", "prescribe", "offer_slot", "send_reminder", "notify_patient"],
        // Back to scheduled for the next visit in a multi-appointment course.
        next: ["billing", "scheduled"],
      },
      billing: {
        label: "Billing",
        requirements: ["procedures recorded"],
        actions: ["raise_invoice", "issue_payment_link", "submit_insurance_claim", "notify_patient"],
        next: ["recall"],
      },
      recall: {
        label: "Recall",
        requirements: ["recall interval set"],
        actions: ["schedule_recall", "send_reminder", "notify_patient"],
        next: ["closed"],
      },
      closed: {
        label: "Closed",
        requirements: [],
        actions: ["chase_balance", "archive_record", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "register_patient", "offer_slot", "reschedule", "send_reminder",
    "record_history", "take_xray", "record_findings",
    "propose_plan", "quote_estimate", "obtain_consent",
    "perform_procedure", "prescribe",
    "raise_invoice", "issue_payment_link", "submit_insurance_claim",
    "schedule_recall", "chase_balance", "archive_record",
    "notify_patient", "close_file",
  ],

  policy: {
    alwaysApprove: {
      prescribe: { why: "prescribing is a clinical decision", approver: "compliance" },
      perform_procedure: { why: "a procedure is a clinical decision", approver: "compliance" },
      propose_plan: { why: "a treatment plan is a clinical decision", approver: "compliance" },
      submit_insurance_claim: { why: "a claim is a declaration made on the patient's behalf", approver: "finance" },
      archive_record: { why: "clinical records have a statutory retention period", approver: "compliance" },
    },
    thresholds: [
      { actions: ["issue_payment_link", "raise_invoice"], measure: "amount", limit: 25_000, trigger: "atOrAbove", approver: "finance" },
      { actions: ["quote_estimate"], measure: "discountPct", limit: 15, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "patient", "appointment", "dentist", "dental", "clinic", "treatment", "filling",
      "root canal", "extraction", "crown", "hygienist", "recall", "x-ray", "xray",
      "consultation", "prescription", "insurance claim", "chair", "orthodontic",
    ],
    entityAliases: {},
    capabilityModules: [
      "chair and clinician availability (double-booking is a real constraint)",
      "insurance claim coding",
    ],
  },
});
