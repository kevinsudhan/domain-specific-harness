/**
 * Gym and fitness studio — a membership business, not an appointment business.
 *
 * The lifecycle here is a *subscription*, which is the first vertical where the item has
 * a renewal date rather than a completion. That changes what "at risk" means: freight
 * risk is a cut-off approaching, gym risk is a member who has not attended in three weeks
 * and whose renewal is due. Both are the sentinel sweeping a clock, which is why the
 * kernel needed nothing new.
 *
 * lapsed → active is the backward edge: a win-back is the same membership resumed, and
 * making it a new record would reset tenure, which is the number retention is judged on.
 */
import { defineVertical } from "./types.js";

export const gym = defineVertical({
  id: "gym",
  label: "Gym & fitness studio",

  business: {
    name: "Fitness studio",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: ["lead", "trial", "onboarding", "active", "at_risk", "lapsed", "closed"],
    initial: "lead",
    states: {
      lead: {
        label: "Lead",
        requirements: ["name", "contact number", "goal"],
        actions: ["register_lead", "offer_trial", "quote_plan", "notify_member"],
        next: ["trial"],
      },
      trial: {
        label: "Trial",
        requirements: ["trial session booked", "waiver signed"],
        actions: ["book_session", "collect_waiver", "send_reminder", "notify_member"],
        next: ["onboarding"],
      },
      onboarding: {
        label: "Onboarding",
        requirements: ["plan chosen", "health declaration on file", "payment mandate set up"],
        actions: ["enrol_member", "collect_health_declaration", "set_up_mandate", "assign_trainer", "notify_member"],
        next: ["active"],
      },
      active: {
        label: "Active member",
        requirements: ["membership in date"],
        actions: ["book_session", "assign_trainer", "charge_subscription", "record_attendance", "notify_member"],
        next: ["at_risk"],
      },
      at_risk: {
        label: "At risk",
        requirements: [],
        // Attendance has dropped or a payment failed. The window where a save is possible.
        actions: ["record_attendance", "offer_winback", "retry_payment", "assign_trainer", "notify_member"],
        next: ["active", "lapsed"],
      },
      lapsed: {
        label: "Lapsed",
        requirements: [],
        actions: ["offer_winback", "cancel_membership", "notify_member"],
        next: ["active", "closed"], // a win-back resumes the same membership
      },
      closed: {
        label: "Closed",
        requirements: [],
        actions: ["settle_balance", "refund", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "register_lead", "offer_trial", "quote_plan", "book_session", "collect_waiver",
    "enrol_member", "collect_health_declaration", "set_up_mandate", "assign_trainer",
    "charge_subscription", "record_attendance", "retry_payment",
    "offer_winback", "cancel_membership", "settle_balance", "refund",
    "send_reminder", "notify_member", "close_file",
  ],

  policy: {
    alwaysApprove: {
      cancel_membership: { why: "cancelling ends a recurring contract", approver: "desk" },
      refund: { why: "a refund returns money already collected", approver: "finance" },
      collect_health_declaration: { why: "a health declaration is a duty-of-care record", approver: "compliance" },
    },
    thresholds: [
      { actions: ["charge_subscription", "settle_balance"], measure: "amount", limit: 20_000, trigger: "atOrAbove", approver: "finance" },
      { actions: ["quote_plan", "offer_winback"], measure: "discountPct", limit: 25, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "gym", "fitness", "member", "membership", "trainer", "personal training", "class",
      "session", "attendance", "renewal", "subscription", "waiver", "lapsed", "churn",
      "induction", "studio", "plan", "mandate",
    ],
    entityAliases: {},
    capabilityModules: [
      "class capacity and trainer availability",
      "recurring-billing retry schedule",
    ],
  },
});
