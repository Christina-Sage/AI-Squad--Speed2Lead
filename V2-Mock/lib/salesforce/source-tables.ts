import type {
  Account,
  ActivityRecord,
  Contact,
  CustomerProductOwnership,
  IntacctFields,
  Lead,
  Opportunity,
} from "@/lib/salesforce/types";
import type { ExactProduct } from "@/lib/products";

/**
 * The ten real source tables, modelled explicitly (Convex-backed).
 *
 * The app's UI reads the embedded `Account` / `AccountBundle` shape (one account
 * with `intacct` / `fusion` sub-objects). The three source systems store that
 * data separately, keyed by the GMO Global Account ID:
 *
 *   GMO Salesforce  — system of record. gmoAccounts + gmoLeads/Contacts/Opps/Activities.
 *   Intacct SF      — customers of Sage Intacct + Sage Intacct Construction.
 *                     intacctAccounts + intacctContacts/Opportunities/Activities.
 *   SAP Fusion      — customer + partner ownership for every non-Intacct product.
 *                     fusionAccounts ONLY — Fusion has no opportunities or activity.
 *
 * `decomposeToSourceTables` splits the embedded fixtures into these rows (the
 * seed path); `assembleAccount` reassembles one embedded `Account` from them
 * (the Convex provider). The two are inverses, so the UI contract is unchanged.
 */

/** GMO account = the embedded Account minus the reassembled sub-objects. */
export type GmoAccountRow = Omit<Account, "intacct" | "fusion" | "customerProducts">;

// Deterministic (no Date/random) native-id synthesis for the mock seed. The
// embedded fixtures model a single account id; real GMO/Intacct/Fusion records
// carry three different ids. These generate stable, system-shaped stand-ins so
// the crosswalk has distinct per-system ids to resolve.
function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Fusion native id: exactly 10 digits, "400" + 7 (matches isFusionAccountId). */
export function fusionNativeId(gmoAccountId: string): string {
  const digits = (hash32(`fusion:${gmoAccountId}`) % 10_000_000).toString().padStart(7, "0");
  return `400${digits}`;
}

/** Intacct native id: a 15-char SF-shaped id, distinct from the GMO id. */
export function intacctNativeId(gmoAccountId: string): string {
  const body = hash32(`intacct:${gmoAccountId}`).toString(36).toUpperCase().padStart(12, "0").slice(0, 12);
  return `001${body}`;
}

/** A product a company owns in one system, current or former. */
export interface OwnedProduct {
  product: ExactProduct;
  status: "current" | "former";
}

/** Fields carried on account rows for cross-instance matching (see match-keys). */
export interface MatchFields {
  company?: string | null;
  website?: string | null;
  domain?: string | null;
  address1?: string | null;
  address2?: string | null;
  address3?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  country?: string | null;
}

/** Intacct SF customer record for an account (Sage Intacct / Intacct Construction). */
export interface IntacctAccountRow extends MatchFields {
  /** TRANSITIONAL join key — still the GMO id (see validators.ts). */
  accountId: string;
  /** Intacct's own native id; distinct from the GMO id. */
  nativeId?: string;
  existingCustomerFlag?: boolean;
  sageId?: string;
  shellAccountStatus?: string;
  varStatus?: string;
  /** Products owned in Intacct SF. */
  products: OwnedProduct[];
}

/** An opportunity worked in Intacct SF (Intacct-SF products only). */
export interface IntacctOpportunityRow {
  accountId: string;
  name: string;
  owner: string;
  createdBy?: string;
  stage: string;
  createdDate: string;
  isClosed: boolean;
}

/** SAP Fusion customer + partner record. No opps or activity live in Fusion. */
export interface FusionAccountRow extends MatchFields {
  /** TRANSITIONAL join key — still the GMO id (see validators.ts). */
  accountId: string;
  /** Fusion's own native id ("400" + 7 digits); distinct from the GMO id. */
  nativeId?: string;
  /** e.g. "Registered - CloudServe". */
  partnerStatus?: string;
  /** Products owned in Fusion (every non-Intacct product). */
  products: OwnedProduct[];
}

export interface SourceTables {
  gmoAccounts: GmoAccountRow[];
  gmoLeads: Lead[];
  gmoContacts: Contact[];
  gmoOpportunities: Opportunity[];
  gmoActivities: ActivityRecord[];
  intacctAccounts: IntacctAccountRow[];
  intacctContacts: Contact[];
  intacctOpportunities: IntacctOpportunityRow[];
  intacctActivities: ActivityRecord[];
  fusionAccounts: FusionAccountRow[];
}

function ownedFor(
  customerProducts: CustomerProductOwnership[] | undefined,
  system: CustomerProductOwnership["system"],
): OwnedProduct[] {
  return (customerProducts ?? [])
    .filter((c) => c.system === system)
    .map((c) => ({ product: c.product, status: c.status }));
}

function hasIntacctData(account: Account): boolean {
  const i = account.intacct;
  return (
    i.existingCustomerFlag !== undefined ||
    i.sageId !== undefined ||
    i.shellAccountStatus !== undefined ||
    i.varStatus !== undefined ||
    (i.openOppDetails?.length ?? 0) > 0 ||
    i.hasOpenOpps ||
    ownedFor(account.customerProducts, "Intacct").length > 0
  );
}

function hasFusionData(account: Account): boolean {
  return (
    account.fusion?.partnerStatus !== undefined ||
    ownedFor(account.customerProducts, "Fusion").length > 0
  );
}

/**
 * Split embedded accounts (+ their GMO child records) into the ten source-table
 * row sets. GMO child tables (leads/contacts/opps/activities) pass through as-is
 * — they already live in GMO and are keyed by accountId.
 */
export function decomposeToSourceTables(
  accounts: Account[],
  leads: Lead[],
  contacts: Contact[],
  opportunities: Opportunity[],
  activities: ActivityRecord[],
): SourceTables {
  const gmoAccounts: GmoAccountRow[] = [];
  const intacctAccounts: IntacctAccountRow[] = [];
  const intacctOpportunities: IntacctOpportunityRow[] = [];
  const fusionAccounts: FusionAccountRow[] = [];

  for (const account of accounts) {
    // Strip the reassembled sub-objects; everything else is a GMO field.
    const { intacct, fusion, customerProducts, ...gmo } = account;
    void intacct;
    void fusion;
    void customerProducts;
    gmoAccounts.push(gmo);

    if (hasIntacctData(account)) {
      const { existingCustomerFlag, sageId, shellAccountStatus, varStatus } = account.intacct;
      intacctAccounts.push({
        accountId: account.id,
        nativeId: intacctNativeId(account.id),
        // Cross-instance match fields, carried from the embedded account.
        company: account.name,
        domain: account.domain,
        ...(account.location ? { address1: account.location } : {}),
        ...(existingCustomerFlag !== undefined ? { existingCustomerFlag } : {}),
        ...(sageId !== undefined ? { sageId } : {}),
        ...(shellAccountStatus !== undefined ? { shellAccountStatus } : {}),
        ...(varStatus !== undefined ? { varStatus } : {}),
        products: ownedFor(account.customerProducts, "Intacct"),
      });
      for (const o of account.intacct.openOppDetails ?? []) {
        intacctOpportunities.push({
          accountId: account.id,
          name: o.name,
          owner: o.owner,
          ...(o.createdBy !== undefined ? { createdBy: o.createdBy } : {}),
          stage: o.stage,
          createdDate: o.createdDate,
          isClosed: false,
        });
      }
    }

    if (hasFusionData(account)) {
      fusionAccounts.push({
        accountId: account.id,
        nativeId: fusionNativeId(account.id),
        // Cross-instance match fields, carried from the embedded account.
        company: account.name,
        domain: account.domain,
        ...(account.location ? { address1: account.location } : {}),
        ...(account.fusion?.partnerStatus !== undefined
          ? { partnerStatus: account.fusion.partnerStatus }
          : {}),
        products: ownedFor(account.customerProducts, "Fusion"),
      });
    }
  }

  return {
    gmoAccounts,
    gmoLeads: leads,
    gmoContacts: contacts,
    gmoOpportunities: opportunities,
    gmoActivities: activities,
    intacctAccounts,
    // The mock fixtures don't model separate Intacct contacts/activities; the
    // tables exist for the real integration and seed empty for now.
    intacctContacts: [],
    intacctOpportunities,
    intacctActivities: [],
    fusionAccounts,
  };
}

/**
 * Reassemble one embedded `Account` from its source rows — the inverse of
 * `decomposeToSourceTables`, used by the Convex provider. `intacct` is always
 * present (defaulting to no open opps); `fusion` and `customerProducts` are set
 * only when the matching source rows exist.
 */
export function assembleAccount(
  gmo: GmoAccountRow,
  intacctAccount: IntacctAccountRow | undefined,
  fusionAccount: FusionAccountRow | undefined,
  intacctOpps: IntacctOpportunityRow[],
): Account {
  const openOppDetails = intacctOpps
    .filter((o) => !o.isClosed)
    .map((o) => ({
      name: o.name,
      owner: o.owner,
      ...(o.createdBy !== undefined ? { createdBy: o.createdBy } : {}),
      stage: o.stage,
      createdDate: o.createdDate,
    }));

  const intacct: IntacctFields = {
    hasOpenOpps: openOppDetails.length > 0,
    ...(openOppDetails.length > 0 ? { openOppDetails } : {}),
    ...(intacctAccount?.existingCustomerFlag !== undefined
      ? { existingCustomerFlag: intacctAccount.existingCustomerFlag }
      : {}),
    ...(intacctAccount?.sageId !== undefined ? { sageId: intacctAccount.sageId } : {}),
    ...(intacctAccount?.shellAccountStatus !== undefined
      ? { shellAccountStatus: intacctAccount.shellAccountStatus }
      : {}),
    ...(intacctAccount?.varStatus !== undefined ? { varStatus: intacctAccount.varStatus } : {}),
  };

  const customerProducts: CustomerProductOwnership[] = [
    ...(intacctAccount?.products ?? []).map((p) => ({ ...p, system: "Intacct" as const })),
    ...(fusionAccount?.products ?? []).map((p) => ({ ...p, system: "Fusion" as const })),
  ];

  return {
    ...gmo,
    intacct,
    ...(fusionAccount ? { fusion: { partnerStatus: fusionAccount.partnerStatus } } : {}),
    ...(customerProducts.length > 0 ? { customerProducts } : {}),
  };
}
