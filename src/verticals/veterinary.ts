/**
 * Veterinary practice — the patient and the client are different species.
 *
 * Structurally this looks like the dental vertical, and the family resemblance is the
 * point: two clinical verticals written independently landed on nearly the same shape,
 * which is what a good abstraction is supposed to produce. The differences are real
 * though — an animal can be admitted (a state dental has no equivalent of), and euthanasia
 * is a decision no system may ever take, at any amount, which is the clearest possible
 * case for alwaysApprove existing at all.
 */
import { defineVertical } from "./types.js";

export const veterinary = defineVertical({
  id: "veterinary",
  label: "Veterinary practice",

  business: {
    name: "Veterinary clinic",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: [
      "enquiry", "scheduled", "consultation", "admitted",
      "treatment", "discharge", "billing", "closed",
    ],
    initial: "enquiry",
    states: {
      enquiry: {
        label: "Enquiry",
        requirements: ["owner contact", "animal name", "species", "presenting problem"],
        actions: ["register_animal", "offer_slot", "triage", "notify_owner"],
        next: ["scheduled"],
      },
      scheduled: {
        label: "Scheduled",
        requirements: ["appointment confirmed"],
        actions: ["offer_slot", "send_reminder", "reschedule", "notify_owner"],
        next: ["consultation"],
      },
      consultation: {
        label: "Consultation",
        requirements: ["history taken", "examination recorded"],
        actions: ["record_history", "examine", "run_diagnostics", "quote_estimate", "notify_owner"],
        next: ["admitted", "treatment"],
      },
      admitted: {
        label: "Admitted",
        requirements: ["consent to admit", "estimate accepted"],
        actions: ["admit_animal", "obtain_consent", "run_diagnostics", "administer_medication", "notify_owner"],
        next: ["treatment"],
      },
      treatment: {
        label: "Treatment",
        requirements: ["consent on file"],
        actions: ["perform_procedure", "administer_medication", "prescribe", "euthanise", "record_notes", "notify_owner"],
        next: ["discharge"],
      },
      discharge: {
        label: "Discharge",
        requirements: ["discharge notes written", "aftercare explained"],
        actions: ["discharge_animal", "issue_aftercare", "schedule_recheck", "notify_owner"],
        next: ["billing"],
      },
      billing: {
        label: "Billing",
        requirements: ["treatments recorded"],
        actions: ["raise_invoice", "issue_payment_link", "submit_insurance_claim", "notify_owner"],
        next: ["closed"],
      },
      closed: {
        label: "Closed",
        requirements: [],
        actions: ["schedule_recheck", "send_vaccination_reminder", "chase_balance", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "register_animal", "triage", "offer_slot", "reschedule", "send_reminder",
    "record_history", "examine", "run_diagnostics", "quote_estimate",
    "admit_animal", "obtain_consent", "administer_medication", "prescribe",
    "perform_procedure", "euthanise", "record_notes",
    "discharge_animal", "issue_aftercare", "schedule_recheck",
    "raise_invoice", "issue_payment_link", "submit_insurance_claim",
    "send_vaccination_reminder", "chase_balance", "notify_owner", "close_file",
  ],

  policy: {
    alwaysApprove: {
      // There is no amount and no circumstance in which this is automatic.
      euthanise: { why: "ending an animal's life is never a system decision", approver: "compliance" },
      prescribe: { why: "prescribing is a veterinary clinical decision", approver: "compliance" },
      perform_procedure: { why: "a procedure is a clinical decision", approver: "compliance" },
      administer_medication: { why: "dosing is a clinical decision", approver: "compliance" },
      submit_insurance_claim: { why: "a claim is a declaration made on the owner's behalf", approver: "finance" },
    },
    thresholds: [
      { actions: ["issue_payment_link", "raise_invoice"], measure: "amount", limit: 25_000, trigger: "atOrAbove", approver: "finance" },
      { actions: ["quote_estimate"], measure: "discountPct", limit: 15, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "animal", "pet", "owner", "vet", "veterinary", "species", "breed", "vaccination",
      "consultation", "admitted", "discharge", "surgery", "clinic", "microchip",
      "aftercare", "recheck", "diagnostics", "kennel", "deworming",
    ],
    entityAliases: {},
    capabilityModules: [
      "weight-based dosing calculation",
      "vaccination schedule by species and age",
    ],
  },
});
