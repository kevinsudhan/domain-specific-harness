/**
 * Salon and spa — appointment-led service with a stylist, a chair and a package balance.
 *
 * Two things here that freight does not have. First, the resource being booked is a
 * *person*, so a no-show costs a slot that cannot be resold after the fact — which is why
 * no_show is a state rather than a flag. Second, prepaid packages mean the money arrives
 * before the service, so "redeem from a balance" is an action distinct from taking a
 * payment, and refunding one is finance's call.
 */
import { defineVertical } from "./types.js";

export const salon = defineVertical({
  id: "salon",
  label: "Salon & spa",

  business: {
    name: "Salon",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: ["enquiry", "booked", "confirmed", "in_service", "checkout", "no_show", "closed"],
    initial: "enquiry",
    states: {
      enquiry: {
        label: "Enquiry",
        requirements: ["client name", "service requested"],
        actions: ["register_client", "offer_slot", "quote_service", "notify_client"],
        next: ["booked"],
      },
      booked: {
        label: "Booked",
        requirements: ["stylist assigned", "slot held"],
        actions: ["assign_stylist", "offer_slot", "take_deposit", "send_reminder", "notify_client"],
        next: ["confirmed", "no_show"],
      },
      confirmed: {
        label: "Confirmed",
        requirements: ["client confirmed attendance"],
        actions: ["send_reminder", "reschedule", "assign_stylist", "notify_client"],
        next: ["in_service", "no_show"],
      },
      in_service: {
        label: "In service",
        requirements: ["client arrived"],
        actions: ["start_service", "add_service", "record_notes", "notify_client"],
        next: ["checkout"],
      },
      checkout: {
        label: "Checkout",
        requirements: ["services recorded"],
        actions: ["raise_invoice", "redeem_package", "issue_payment_link", "sell_package", "notify_client"],
        next: ["closed"],
      },
      no_show: {
        label: "No show",
        requirements: [],
        // A held slot that went unused. Charging the deposit is a commercial decision.
        actions: ["charge_no_show", "release_slot", "rebook", "notify_client"],
        next: ["booked", "closed"],
      },
      closed: {
        label: "Closed",
        requirements: [],
        actions: ["schedule_rebook", "request_review", "refund", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "register_client", "offer_slot", "reschedule", "assign_stylist", "send_reminder",
    "quote_service", "take_deposit", "start_service", "add_service", "record_notes",
    "raise_invoice", "issue_payment_link", "sell_package", "redeem_package",
    "charge_no_show", "release_slot", "rebook", "schedule_rebook",
    "request_review", "refund", "notify_client", "close_file",
  ],

  policy: {
    alwaysApprove: {
      charge_no_show: { why: "charging for a missed appointment is a commercial position", approver: "desk" },
      refund: { why: "a refund returns money already taken", approver: "finance" },
    },
    thresholds: [
      { actions: ["issue_payment_link", "raise_invoice", "sell_package"], measure: "amount", limit: 15_000, trigger: "atOrAbove", approver: "finance" },
      { actions: ["quote_service"], measure: "discountPct", limit: 20, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "salon", "spa", "stylist", "beautician", "appointment", "haircut", "colour",
      "facial", "massage", "manicure", "pedicure", "therapist", "chair", "package",
      "membership", "walk-in", "no show", "deposit", "treatment room",
    ],
    entityAliases: {},
    capabilityModules: [
      "stylist rota and slot availability",
      "prepaid package balance arithmetic",
    ],
  },
});
