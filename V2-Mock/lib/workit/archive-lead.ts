/**
 * SDR lead "Status Reason" options, mirroring the picklist in Salesforce. Used
 * by the SDR-only "Mark as Archived" control on the work-it view.
 */
export const ARCHIVE_STATUS_REASONS: string[] = [
  "ABX",
  "Active Sales Cycle",
  "Competitor",
  "Engaged Another Contact",
  "Future Interest",
  "No Budget",
  "No Response",
  "Not Decision Maker",
  "Not Enough Pain / Need / ROI",
  "Not Interested",
  "Other - Please Specify",
  "Partner Involvement",
  "Product Fit",
  "Transfer",
  "Unable To Meet Needs",
];

/** The reason value that requires a free-text "Other Archive Reason". */
export const OTHER_ARCHIVE_REASON = "Other - Please Specify";
