import type { PriorityGroup } from "@/lib/priority";
import type { Product } from "@/lib/products";
import type { DedupeCheck, FinalStatus } from "@/lib/workability/engine";
import type { Team } from "@/lib/teams";

/**
 * A worklist lead for the SDR team. Distinct from the Salesforce `Lead` records
 * used for ROE checks — these are the "people, not companies" the SDR worklist
 * ranks (build-plan step 5). Fit/intent/workability are fixture-driven, mirroring
 * how account scoring works.
 */
export interface SdrLead {
  id: string;
  name: string;
  title: string;
  /** Linked Salesforce account, or null for a lead with no account. */
  accountId: string | null;
  ownerName: string;
  status: string;
  priorityGroup: PriorityGroup;
  /** Sage product line — drives the dashboard product filter. */
  product: Product;
  fit: number;
  intent: number;
  workability: number;
  /** Overall "Should I work it?" score, precomputed for the worklist. */
  score: number;
  /**
   * Optional intake metadata, present on leads created through the web-form
   * simulation (`/simulate`). Fixture leads leave these undefined. `company` is
   * used as the worklist display name when the lead has no linked account yet.
   */
  company?: string | null;
  email?: string | null;
  /** How the lead entered the system, e.g. "Web form — Requested a demo". */
  source?: string | null;
  /** ISO timestamp the lead was captured. */
  createdAt?: string | null;
}

/** Lightweight row for the ranked SDR worklist. */
export interface SdrLeadListItem {
  id: string;
  name: string;
  title: string;
  accountId: string | null;
  accountName: string | null;
  domain: string | null;
  priorityGroup: PriorityGroup;
  product: Product;
  score: number;
  fit: number;
  intent: number;
  workability: number;
  /**
   * True for a freshly captured web-form lead that just arrived in the worklist
   * (within the "new lead" window). Fixture leads are never flagged. Drives the
   * "New" badge on the worklist row.
   */
  isNew: boolean;
}

/** Lead-level "Can I work it?" verdict (build-plan step 6). */
export interface LeadWorkabilityResult {
  lead_id: string;
  name: string;
  title: string;
  account_id: string | null;
  account_name: string | null;
  domain: string | null;
  owner: string;
  status: string;
  team: Team;
  priority_group: PriorityGroup;
  final_status: FinalStatus;
  reason: string;
  recommendation: string;
  checks: DedupeCheck[];
}
