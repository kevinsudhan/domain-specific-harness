/**
 * Tutoring and coaching centre — enrolment, a batch, and the term that has to be renewed.
 *
 * The payer and the student are different people, which is the structural difference from
 * every other vertical here. Anything that communicates a result goes to the guardian;
 * anything about scheduling goes to both. That is why notify_guardian and notify_student
 * are separate actions rather than one notify — collapsing them is how a system ends up
 * sending a failed assessment to a fourteen-year-old and nobody else.
 */
import { defineVertical } from "./types.js";

export const tutoring = defineVertical({
  id: "tutoring",
  label: "Tutoring centre",

  business: {
    name: "Coaching centre",
    currency: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
  },

  lifecycle: {
    order: [
      "enquiry", "assessment", "enrolled", "in_term",
      "assessed", "renewal", "lapsed", "closed",
    ],
    initial: "enquiry",
    states: {
      enquiry: {
        label: "Enquiry",
        requirements: ["student name", "guardian contact", "subject", "current level"],
        actions: ["register_enquiry", "book_assessment", "quote_fees", "notify_guardian"],
        next: ["assessment"],
      },
      assessment: {
        label: "Placement assessment",
        requirements: ["assessment completed"],
        actions: ["conduct_assessment", "recommend_batch", "notify_guardian"],
        next: ["enrolled"],
      },
      enrolled: {
        label: "Enrolled",
        requirements: ["batch assigned", "fees agreed", "consent on file"],
        actions: ["assign_batch", "collect_fees", "issue_materials", "notify_guardian", "notify_student"],
        next: ["in_term"],
      },
      in_term: {
        label: "In term",
        requirements: ["batch running"],
        actions: ["record_attendance", "assign_homework", "reschedule_class", "notify_student", "notify_guardian"],
        next: ["assessed"],
      },
      assessed: {
        label: "Assessed",
        requirements: ["term assessment marked"],
        actions: ["mark_assessment", "issue_report", "recommend_batch", "notify_guardian"],
        next: ["renewal"],
      },
      renewal: {
        label: "Renewal due",
        requirements: ["next term dates published"],
        actions: ["offer_renewal", "collect_fees", "quote_fees", "notify_guardian"],
        next: ["in_term", "lapsed"],
      },
      lapsed: {
        label: "Lapsed",
        requirements: [],
        actions: ["offer_renewal", "notify_guardian"],
        next: ["in_term", "closed"],
      },
      closed: {
        label: "Closed",
        requirements: [],
        actions: ["issue_certificate", "refund_fees", "close_file"],
        next: [],
      },
    },
  },

  actions: [
    "register_enquiry", "book_assessment", "conduct_assessment", "recommend_batch",
    "quote_fees", "assign_batch", "collect_fees", "issue_materials",
    "record_attendance", "assign_homework", "reschedule_class",
    "mark_assessment", "issue_report", "offer_renewal",
    "issue_certificate", "refund_fees",
    "notify_guardian", "notify_student", "close_file",
  ],

  policy: {
    alwaysApprove: {
      issue_report: { why: "a progress report is a judgement about a child", approver: "desk" },
      issue_certificate: { why: "a certificate is a formal attestation", approver: "compliance" },
      refund_fees: { why: "a refund returns money already collected", approver: "finance" },
      // A result goes to the guardian, never to the student alone, and never unreviewed.
      mark_assessment: { why: "an assessment result must be reviewed before release", approver: "desk" },
    },
    thresholds: [
      { actions: ["collect_fees"], measure: "amount", limit: 30_000, trigger: "atOrAbove", approver: "finance" },
      { actions: ["quote_fees", "offer_renewal"], measure: "discountPct", limit: 20, trigger: "above", approver: "desk" },
    ],
  },

  builder: {
    vocabulary: [
      "student", "guardian", "parent", "tutor", "batch", "class", "subject", "syllabus",
      "term", "enrolment", "enrollment", "assessment", "homework", "attendance",
      "report card", "coaching", "fees", "renewal", "exam",
    ],
    entityAliases: {},
    capabilityModules: [
      "batch capacity and timetable clash detection",
      "assessment scoring against a syllabus level",
    ],
  },
});
