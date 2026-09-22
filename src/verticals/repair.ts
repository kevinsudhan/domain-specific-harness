/**
 * Repair shop — devices and appliances taken in, diagnosed, quoted, fixed, returned.
 *
 * The defining constraint is custody: the shop is holding something that belongs to
 * someone else. So "release the item" carries the same weight that releasing cargo does
 * in freight — it is the point of no return, and it sits in alwaysApprove for the same
 * reason release_do does.
 *
 * awaiting_approval → diagnosed is the backward edge: a customer who rejects a quote may
 * ask for a different option on the same diagnosis, and re-diagnosing would bill them
 * twice for one inspection.
 */
import { defineVertical } from "./types.js";

export const repair = defineVertical({
  id: "repair",
  label: "Repair shop",

  business: {
    name: "Repair workshop",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: [
      "intake", "diagnosed", "awaiting_approval", "awaiting_parts",
      "in_repair", "tested", "ready", "collected",
    ],
    initial: "intake",
    states: {
      intake: {
        label: "Booked in",
        requirements: ["customer contact", "item description", "reported fault", "condition noted"],
        actions: ["book_in", "record_condition", "issue_receipt", "notify_customer"],
        next: ["diagnosed"],
      },
      diagnosed: {
        label: "Diagnosed",
        requirements: ["fault identified", "estimate prepared"],
        actions: ["diagnose", "quote_repair", "check_warranty", "notify_customer"],
        next: ["awaiting_approval"],
      },
      awaiting_approval: {
        label: "Awaiting customer approval",
        requirements: ["estimate sent"],
        actions: ["quote_repair", "chase_approval", "decline_repair", "notify_customer"],
        next: ["awaiting_parts", "in_repair", "ready", "diagnosed"],
      },
      awaiting_parts: {
        label: "Awaiting parts",
        requirements: ["part ordered"],
        actions: ["order_part", "chase_supplier", "notify_customer"],
        next: ["in_repair"],
      },
      in_repair: {
        label: "In repair",
        requirements: ["approval on file"],
        actions: ["perform_repair", "order_part", "record_notes", "notify_customer"],
        next: ["tested"],
      },
      tested: {
        label: "Tested",
        requirements: ["function test passed"],
        actions: ["test_item", "record_notes", "raise_invoice", "notify_customer"],
        next: ["ready"],
      },
      ready: {
        label: "Ready for collection",
        requirements: ["invoice settled or payment on collection agreed"],
        actions: ["raise_invoice", "issue_payment_link", "chase_collection", "notify_customer"],
        next: ["collected"],
      },
      collected: {
        label: "Collected",
        requirements: ["customer signature", "warranty period recorded"],
        actions: ["release_item", "register_warranty", "request_review", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "book_in", "record_condition", "issue_receipt",
    "diagnose", "quote_repair", "check_warranty", "chase_approval", "decline_repair",
    "order_part", "chase_supplier", "perform_repair", "record_notes", "test_item",
    "raise_invoice", "issue_payment_link", "chase_collection",
    "release_item", "register_warranty", "request_review",
    "notify_customer", "close_file",
  ],

  policy: {
    alwaysApprove: {
      release_item: { why: "releasing the item hands back someone else's property", approver: "desk" },
      decline_repair: { why: "declining ends the job and may forfeit a deposit", approver: "desk" },
      check_warranty: { why: "a warranty determination commits the manufacturer's liability", approver: "compliance" },
    },
    thresholds: [
      { actions: ["issue_payment_link", "raise_invoice"], measure: "amount", limit: 20_000, trigger: "atOrAbove", approver: "finance" },
      { actions: ["quote_repair"], measure: "discountPct", limit: 15, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "repair", "workshop", "technician", "device", "appliance", "fault", "diagnosis",
      "estimate", "spare part", "parts", "warranty", "job card", "booked in",
      "collection", "serial number", "bench", "rework",
    ],
    entityAliases: {},
    capabilityModules: [
      "parts stock and supplier lead time",
      "warranty entitlement lookup by serial number",
    ],
  },
});
