/**
 * Catering and events — a date-locked business where the deadline is the whole risk.
 *
 * This is the closest vertical to freight, and deliberately so: an event date is a
 * cut-off. It cannot slip, the cost of missing it is total rather than incremental, and
 * everything upstream is a countdown. The cut-off sentinel needed no changes to sweep it,
 * which is the clearest evidence that the sentinel is about clocks rather than about
 * shipping.
 *
 * The backward edge is confirmed → quoted: guest numbers change, and a revised headcount
 * is a re-quote of the same event rather than a new booking.
 */
import { defineVertical } from "./types.js";

export const catering = defineVertical({
  id: "catering",
  label: "Catering & events",

  business: {
    name: "Catering company",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: [
      "enquiry", "quoted", "confirmed", "menu_locked",
      "procurement", "execution", "settled", "closed",
    ],
    initial: "enquiry",
    states: {
      enquiry: {
        label: "Enquiry",
        requirements: ["event date", "venue", "guest estimate", "cuisine"],
        actions: ["register_enquiry", "check_availability", "notify_client"],
        next: ["quoted"],
      },
      quoted: {
        label: "Quoted",
        requirements: ["menu proposal sent", "price per head quoted"],
        actions: ["propose_menu", "quote_event", "check_availability", "notify_client"],
        next: ["confirmed"],
      },
      confirmed: {
        label: "Confirmed",
        requirements: ["advance received", "date blocked"],
        actions: ["collect_advance", "block_date", "assign_crew", "notify_client"],
        next: ["menu_locked"],
      },
      menu_locked: {
        label: "Menu locked",
        requirements: ["final headcount", "menu signed off", "dietary requirements captured"],
        actions: ["lock_menu", "record_dietary", "confirm_headcount", "notify_client"],
        // Headcount changes send it back to re-quote rather than creating a second event.
        next: ["procurement", "quoted"],
      },
      procurement: {
        label: "Procurement",
        requirements: ["ingredients ordered", "equipment reserved"],
        actions: ["raise_purchase_order", "reserve_equipment", "assign_crew", "notify_supplier"],
        next: ["execution"],
      },
      execution: {
        label: "Execution",
        requirements: ["crew briefed", "food safety checks recorded"],
        actions: ["dispatch_crew", "record_food_safety", "notify_client", "notify_supplier"],
        next: ["settled"],
      },
      settled: {
        label: "Settled",
        requirements: ["final invoice raised"],
        actions: ["raise_invoice", "issue_payment_link", "settle_supplier", "notify_client"],
        next: ["closed"],
      },
      closed: {
        label: "Closed",
        requirements: [],
        actions: ["request_review", "refund_advance", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "register_enquiry", "check_availability", "propose_menu", "quote_event",
    "collect_advance", "block_date", "assign_crew",
    "lock_menu", "record_dietary", "confirm_headcount",
    "raise_purchase_order", "reserve_equipment",
    "dispatch_crew", "record_food_safety",
    "raise_invoice", "issue_payment_link", "settle_supplier",
    "request_review", "refund_advance",
    "notify_client", "notify_supplier", "close_file",
  ],

  policy: {
    alwaysApprove: {
      block_date: { why: "blocking a date turns away every other booking for it", approver: "desk" },
      record_dietary: { why: "an allergen record is a food-safety obligation", approver: "compliance" },
      record_food_safety: { why: "food safety checks are a statutory record", approver: "compliance" },
      refund_advance: { why: "a refund returns money already taken", approver: "finance" },
    },
    thresholds: [
      // One brake per measure, which is what the kernel exposes. Money out (supplier
      // orders) and money in (client invoices) share the limit rather than carrying two,
      // because a second amount threshold would be dead config — the gate reads one.
      {
        actions: ["raise_purchase_order", "settle_supplier", "issue_payment_link", "raise_invoice", "collect_advance"],
        measure: "amount", limit: 50_000, trigger: "atOrAbove", approver: "finance",
      },
      { actions: ["quote_event"], measure: "discountPct", limit: 12, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "catering", "event", "banquet", "menu", "guest", "headcount", "per head", "venue",
      "buffet", "crew", "chef", "cuisine", "dietary", "allergen", "advance",
      "wedding", "function", "covers", "kitchen",
    ],
    entityAliases: {},
    capabilityModules: [
      "kitchen and crew capacity against a fixed event date",
      "per-head costing with wastage allowance",
    ],
  },
});
