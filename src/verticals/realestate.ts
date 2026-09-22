/**
 * Real estate brokerage — a listing taken to completion.
 *
 * The lifecycle belongs to the *property*, not the buyer, which is why offer_received
 * loops back to listed when a sale falls through. A collapsed chain is the single most
 * common event in this business, and treating it as a dead record would lose the viewing
 * history and the price feedback that make the relist quicker.
 *
 * Note that the money thresholds here are an order of magnitude above the service
 * verticals: a deposit is lakhs, not thousands, so a ₹50,000 brake would hold every
 * transaction and be ignored within a week. A threshold nobody can respect is worse than
 * none, because it trains people to click through.
 */
import { defineVertical } from "./types.js";

export const realestate = defineVertical({
  id: "realestate",
  label: "Real estate brokerage",

  business: {
    name: "Property brokerage",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: [
      "appraisal", "listed", "viewing", "offer_received",
      "under_agreement", "due_diligence", "registration", "completed",
    ],
    initial: "appraisal",
    states: {
      appraisal: {
        label: "Appraisal",
        requirements: ["owner contact", "property address", "asking price agreed"],
        actions: ["appraise_property", "agree_commission", "notify_owner"],
        next: ["listed"],
      },
      listed: {
        label: "Listed",
        requirements: ["listing agreement signed", "photographs on file"],
        actions: ["publish_listing", "adjust_price", "schedule_viewing", "notify_owner", "notify_buyer"],
        next: ["viewing"],
      },
      viewing: {
        label: "Viewings",
        requirements: ["viewing slot confirmed"],
        actions: ["schedule_viewing", "record_feedback", "adjust_price", "notify_buyer", "notify_owner"],
        next: ["offer_received"],
      },
      offer_received: {
        label: "Offer received",
        requirements: ["offer in writing", "buyer funding position stated"],
        actions: ["present_offer", "negotiate_price", "verify_funding", "notify_owner", "notify_buyer"],
        next: ["under_agreement", "listed"], // back to listed when an offer collapses
      },
      under_agreement: {
        label: "Under agreement",
        requirements: ["agreement to sell executed", "token advance received"],
        actions: ["draft_agreement", "collect_deposit", "notify_owner", "notify_buyer"],
        next: ["due_diligence"],
      },
      due_diligence: {
        label: "Due diligence",
        requirements: ["title verified", "encumbrance certificate obtained"],
        actions: ["verify_title", "order_search", "request_document", "notify_buyer"],
        next: ["registration", "listed"],
      },
      registration: {
        label: "Registration",
        requirements: ["stamp duty paid", "registration slot booked"],
        actions: ["book_registration", "pay_stamp_duty", "notify_buyer", "notify_owner"],
        next: ["completed"],
      },
      completed: {
        label: "Completed",
        requirements: ["deed registered", "keys handed over"],
        actions: ["release_keys", "raise_invoice", "issue_payment_link", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "appraise_property", "agree_commission", "publish_listing", "adjust_price",
    "schedule_viewing", "record_feedback",
    "present_offer", "negotiate_price", "verify_funding",
    "draft_agreement", "collect_deposit",
    "verify_title", "order_search", "request_document",
    "book_registration", "pay_stamp_duty", "release_keys",
    "raise_invoice", "issue_payment_link",
    "notify_owner", "notify_buyer", "close_file",
  ],

  policy: {
    alwaysApprove: {
      verify_title: { why: "a title opinion is a legal determination", approver: "compliance" },
      pay_stamp_duty: { why: "stamp duty is a statutory payment", approver: "finance" },
      release_keys: { why: "handing over keys transfers possession", approver: "desk" },
      adjust_price: { why: "the asking price is the owner's decision, not the agent's", approver: "desk" },
    },
    thresholds: [
      { actions: ["collect_deposit", "issue_payment_link", "raise_invoice"], measure: "amount", limit: 500_000, trigger: "atOrAbove", approver: "finance" },
      { actions: ["negotiate_price", "agree_commission"], measure: "discountPct", limit: 5, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "property", "listing", "buyer", "seller", "owner", "viewing", "offer", "broker",
      "commission", "title", "encumbrance", "registration", "stamp duty", "deed",
      "possession", "tenant", "lease", "asking price", "site visit",
    ],
    entityAliases: {},
    capabilityModules: [
      "title and encumbrance verification",
      "stamp duty and registration fee calculation by state",
    ],
  },
});
