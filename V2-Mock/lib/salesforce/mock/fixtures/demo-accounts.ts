import type { Account, Contact, Opportunity } from "@/lib/salesforce/types";
import type { SdrLead } from "@/lib/leads/types";
import type { PriorityGroup } from "@/lib/priority";
import type { Product } from "@/lib/products";
import { PRODUCTS } from "@/lib/products";
import { daysAgo } from "@/lib/salesforce/mock/fixtures/dates";

/**
 * Generated BDR demo accounts, spread across every product line so switching the
 * dashboard Product filter always shows a populated worklist. For each product
 * this produces a scaled-but-complete mix (20 accounts):
 *
 *   Blocked by de-dupe (10): 2 existing-customer, 2 partner deal registration,
 *     2 open opportunity, 2 ROE conflict, 2 disqualified-opp cooling-off.
 *   Today's Worklist (10): 7 workable, 3 workable-with-review (expired TAM).
 *
 * The ROE and DQ blocks depend on linked records, so this module also emits the
 * matching contacts (recent activity inside the 30-day ROE window) and
 * opportunities (reached Discovery+ inside the 6-month cooling-off window).
 *
 * Everything is derived deterministically from a fixed index — no randomness —
 * so ids, names, and domains are stable across runs (required: the store is
 * seeded from these fixtures and Date-based randomness is disallowed).
 */

type BlockKind = "existing-customer" | "partner" | "open-opp" | "roe" | "dq";
type SlotKind = "blocked" | "workable" | "review";

interface Slot {
  kind: SlotKind;
  block?: BlockKind;
  /** 2-letter tag baked into the generated id for readability. */
  code: string;
}

// 20 slots per product, in a stable order.
const SLOTS: Slot[] = [
  { kind: "blocked", block: "existing-customer", code: "EC" },
  { kind: "blocked", block: "existing-customer", code: "EC" },
  { kind: "blocked", block: "partner", code: "PT" },
  { kind: "blocked", block: "partner", code: "PT" },
  { kind: "blocked", block: "open-opp", code: "OP" },
  { kind: "blocked", block: "open-opp", code: "OP" },
  { kind: "blocked", block: "roe", code: "RO" },
  { kind: "blocked", block: "roe", code: "RO" },
  { kind: "blocked", block: "dq", code: "DQ" },
  { kind: "blocked", block: "dq", code: "DQ" },
  { kind: "workable", code: "WK" },
  { kind: "workable", code: "WK" },
  { kind: "workable", code: "WK" },
  { kind: "workable", code: "WK" },
  { kind: "workable", code: "WK" },
  { kind: "workable", code: "WK" },
  { kind: "workable", code: "WK" },
  { kind: "review", code: "RV" },
  { kind: "review", code: "RV" },
  { kind: "review", code: "RV" },
];

// One distinct letter per product line, used as the id prefix so generated ids
// stay unique and readable (e.g. "0015Y00000IEC000" = Intacct, existing customer).
const PRODUCT_CHAR: Record<Product, string> = {
  Intacct: "I",
  X3: "X",
  BMS: "B",
  S50: "S",
  CRE: "C",
  SSG: "G",
};

// 24 adjectives × 5 nouns = 120 unique company names — exactly one per generated
// account (6 products × 20 slots), so names and slug-derived domains never clash.
const ADJECTIVES = [
  "Meridian", "Cascade", "Summit", "Harbor", "Alpine", "Greenfield",
  "Nimbus", "Redwood", "Vertex", "Coastal", "Pinnacle", "Lumen",
  "Ironclad", "Solstice", "Beacon", "Trailhead", "Cobalt", "Riverside",
  "Fairmont", "Willow", "Cedar", "Northgate", "Bluewater", "Keystone",
];
const NOUNS = ["Group", "Partners", "Holdings", "Systems", "Collective"];

const INDUSTRIES = [
  "Manufacturing",
  "Healthcare",
  "Nonprofit",
  "Technology",
  "Wholesale Distribution",
  "Financial Services",
  "Business Services",
  "Hospitality",
];

const OWNERS = [
  { id: "u-pat", name: "Pat Lee" },
  { id: "u-jamie", name: "Jamie Park" },
  { id: "u-alex", name: "Alex Rivera" },
];

const PARTNERS = [
  "Cloud9 Consulting",
  "LedgerLine Partners",
  "BlueSky Advisors",
  "Summit VAR Group",
  "NorthStar Consulting",
  "EdTech Solutions",
  "CloudServe Partners",
];

const OPP_STAGES = ["Discovery", "Demo", "Evaluation", "Proposal", "Negotiation"];
// DQ opps must have reached Discovery or later to trigger the cooling-off block.
const DQ_STAGES = ["Discovery", "Demo", "Evaluation", "Proposal"];

const CONTACT_FIRST = [
  "Jordan", "Avery", "Sasha", "Robin", "Dana", "Quinn",
  "Riley", "Casey", "Morgan", "Taylor", "Drew", "Reese",
];
const CONTACT_LAST = [
  "Wells", "Nolan", "Kim", "Shah", "Fields", "Alvarez",
  "Brooks", "Nguyen", "Patel", "Diaz", "Ford", "Chen",
];
const CONTACT_TITLES = [
  "VP of Finance",
  "Controller",
  "Finance Director",
  "Head of RevOps",
  "Director of Finance",
];

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// ---- SDR worklist leads --------------------------------------------------

// Names for generated leads — kept distinct from the base fixture leads (Sarah
// Chen, Marcus Webb, …) and combined so all 54 fresh names are globally unique
// (a lead sharing a name/email with an earlier lead would be flagged a
// duplicate by the de-dupe pass, which we only want for the intended pairs).
const LEAD_FIRST = [
  "Elena", "Victor", "Nadia", "Omar", "Sofia", "Derek",
  "Layla", "Grant", "Mira", "Felix", "Iris", "Hugo",
  "Tessa", "Reuben", "Paige", "Colin", "Yara", "Dominic",
];
const LEAD_LAST = ["Hale", "Bright", "Okafor", "Vance", "Delgado", "Ashworth"];

// Companies for the no-account leads, so a domain can still be inferred from a
// work email even without a linked Salesforce account. Real companies with real
// domains, so standalone-lead research returns public data. A mix of nonprofits
// (ProPublica 990 revenue/officers) and for-profits (ZoomInfo + LinkedIn Sales
// Navigator intel — see getCompanyIntelByDomain). One per product line.
const LEAD_COMPANIES = [
  { name: "Feeding America", domain: "feedingamerica.org", industry: "Nonprofit" },
  { name: "Zapier", domain: "zapier.com", industry: "Technology" },
  { name: "Teach For America", domain: "teachforamerica.org", industry: "Nonprofit" },
  { name: "Gusto", domain: "gusto.com", industry: "Technology" },
  { name: "Habitat for Humanity International", domain: "habitat.org", industry: "Nonprofit" },
  { name: "Bombas", domain: "bombas.com", industry: "Wholesale Distribution" },
];

// The ten outcomes demonstrated per product line. `account` names which of the
// product's generated accounts to link to (or none); `ownedByOther` forces a
// lead-level ROE fail; `dup` marks a lead that should land in Blocked by
// de-dupe. Priorities are spread P1 / P2/3 / P4/5 so every tab shows a few.
type LeadAccountRef = "workable" | "review" | "openOpp" | "customer" | "dq" | "roe" | null;
interface LeadSpec {
  outcome: string;
  account: LeadAccountRef;
  ownedByOther?: boolean;
  dup?: "name" | "email";
  priority: PriorityGroup;
  title: string;
  fit: number;
  intent: number;
  workability: number;
}

// The account slot indices (see SLOTS) each ref points at, by kind.
const LEAD_ACCOUNT_SLOT: Record<Exclude<LeadAccountRef, null>, { code: string; si: number }> = {
  customer: { code: "EC", si: 0 },
  openOpp: { code: "OP", si: 4 },
  roe: { code: "RO", si: 6 },
  dq: { code: "DQ", si: 8 },
  workable: { code: "WK", si: 10 },
  review: { code: "RV", si: 17 },
};

const LEAD_SPECS: LeadSpec[] = [
  { outcome: "Workable w/ review — linked to a workable account", account: "workable", priority: "P1", title: "VP of Finance", fit: 82, intent: 78, workability: 74 },
  { outcome: "Workable w/ review — linked account itself needs review", account: "review", priority: "P2/3", title: "Controller", fit: 66, intent: 60, workability: 70 },
  { outcome: "Not workable — open opportunity on the linked account", account: "openOpp", priority: "P1", title: "CFO", fit: 74, intent: 71, workability: 55 },
  { outcome: "Not workable — linked account is an existing customer", account: "customer", priority: "P2/3", title: "Finance Director", fit: 58, intent: 52, workability: 50 },
  { outcome: "Not workable — linked account in DQ cooling-off", account: "dq", priority: "P4/5", title: "Accounting Manager", fit: 62, intent: 55, workability: 52 },
  { outcome: "Not workable — ROE conflict on the linked account", account: "roe", priority: "P4/5", title: "AP Manager", fit: 68, intent: 64, workability: 48 },
  { outcome: "Workable w/ review — no linked account (confirm/create)", account: null, priority: "P1", title: "Head of Finance", fit: 60, intent: 56, workability: 58 },
  { outcome: "Not workable — lead owned by another rep (ROE)", account: "review", ownedByOther: true, priority: "P2/3", title: "VP Operations", fit: 70, intent: 66, workability: 45 },
  { outcome: "Blocked by de-dupe — duplicate name", account: "workable", dup: "name", priority: "P1", title: "VP of Finance", fit: 76, intent: 72, workability: 70 },
  { outcome: "Blocked by de-dupe — duplicate email", account: null, dup: "email", priority: "P4/5", title: "Staff Accountant", fit: 50, intent: 46, workability: 54 },
];

const LEAD_OWNER = { name: "Pat Lee" };

// Real campaign codes used as each lead's Marketing Campaign Source. Every lead
// gets one so the Lead Summary never shows a blank campaign.
const LEAD_CAMPAIGNS = [
  "INT_24Q1_NCA_CA_TECContentSyndicationTOFU",
  "INT_PDF_NCA_US_0009InfusemediaContentSynd",
  "INT_24Q2_NCA_CA_ZiffDavisAppointment",
  "INT_23Q3_NCA_US_0009NFPProductTour",
  "INT_24Q1_NCA_CA_DigitalZoneHQL",
  "INT_TOO_NCA_CA_ProductTourProgressiveEN",
];

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

interface Generated {
  accounts: Account[];
  contacts: Contact[];
  opportunities: Opportunity[];
  sdrLeads: SdrLead[];
}

function build(): Generated {
  const accounts: Account[] = [];
  const contacts: Contact[] = [];
  const opportunities: Opportunity[] = [];
  const sdrLeads: SdrLead[] = [];

  PRODUCTS.forEach((productInfo, pi) => {
    const product = productInfo.id;
    const prodChar = PRODUCT_CHAR[product];

    SLOTS.forEach((slot, si) => {
      const g = pi * SLOTS.length + si; // 0..95, globally unique
      const name = `${ADJECTIVES[g % ADJECTIVES.length]} ${NOUNS[Math.floor(g / ADJECTIVES.length) % NOUNS.length]}`;
      const industry = INDUSTRIES[g % INDUSTRIES.length];
      const isNonprofit = industry === "Nonprofit";
      const domain = `${slug(name)}.${isNonprofit ? "org" : "com"}`;
      const id = `0015Y00000${prodChar}${slot.code}${pad3(si)}`;
      const owner = OWNERS[g % OWNERS.length];
      const rating = (["P1", "P2", "P3"] as const)[g % 3];
      const buyingStage = (["Awareness", "Consideration", "Purchase", "Decision", "Target"] as const)[g % 5];

      // Fields common to every generated account.
      const base: Account = {
        id,
        name,
        domain,
        ownerId: "house",
        ownerName: "House Account",
        industry,
        type: "Prospect",
        product,
        tam: product,
        buyingStage,
        rating,
        abmNurtureStatus: null,
        lastActivityDate: null,
        intacct: { hasOpenOpps: false },
      };

      if (slot.kind === "workable") {
        accounts.push(base);
        return;
      }

      if (slot.kind === "review") {
        // Expired TAM on a prospect -> WORKABLE WITH REVIEW.
        accounts.push({ ...base, tam: `Expired ${product} TAM` });
        return;
      }

      // slot.kind === "blocked": shape the account (and any linked records) so
      // exactly one of the six checks hard-fails.
      switch (slot.block) {
        case "existing-customer":
          // Customer type with a blank TAM -> potential direct customer.
          accounts.push({ ...base, type: "Customer", tam: null, intacct: { hasOpenOpps: false, existingCustomerFlag: true } });
          break;

        case "partner":
          // Active partner deal registration.
          accounts.push({
            ...base,
            intacct: { hasOpenOpps: false, varStatus: `Registered - ${PARTNERS[g % PARTNERS.length]}` },
          });
          break;

        case "open-opp":
          // An open Intacct opportunity already exists.
          accounts.push({
            ...base,
            intacct: {
              hasOpenOpps: true,
              openOppDetails: [
                {
                  name: `${name} - ${product} Opportunity`,
                  owner: owner.name,
                  stage: OPP_STAGES[g % OPP_STAGES.length],
                  createdDate: daysAgo(10 + (g % 40)),
                },
              ],
            },
          });
          break;

        case "roe": {
          // A linked contact has activity inside the 30-day ROE window.
          accounts.push(base);
          contacts.push({
            id: `003-DEMO-${prodChar}${pad3(si)}`,
            name: `${CONTACT_FIRST[g % CONTACT_FIRST.length]} ${CONTACT_LAST[(g * 5) % CONTACT_LAST.length]}`,
            title: CONTACT_TITLES[g % CONTACT_TITLES.length],
            ownerId: owner.id,
            ownerName: owner.name,
            accountId: id,
            lastActivityDate: daysAgo(3 + (g % 25)), // 3..27 days -> inside window
          });
          break;
        }

        case "dq": {
          // A disqualified opp that reached Discovery+. Some closed inside the
          // 30-day cooling-off (-> review), others past it (-> clear to re-work).
          accounts.push(base);
          const closed = 10 + (g % 5) * 15; // 10,25 (<30, review) / 40,55,70 (clear)
          opportunities.push({
            id: `006-DEMO-${prodChar}${pad3(si)}`,
            name: `${name} - ${product} Evaluation`,
            accountId: id,
            ownerId: owner.id,
            ownerName: owner.name,
            stage: "Closed Lost - Disqualified",
            isClosed: true,
            createdDate: daysAgo(closed + 120),
            furthestStage: DQ_STAGES[g % DQ_STAGES.length],
            closedDate: daysAgo(closed),
          });
          break;
        }
      }
    });
  });

  // SDR worklist leads — 10 per product line, each exercising a different
  // "Can I work this lead?" outcome, linked to the accounts generated above.
  let leadNameIdx = 0;
  const freshName = () => {
    const name = `${LEAD_FIRST[leadNameIdx % LEAD_FIRST.length]} ${LEAD_LAST[Math.floor(leadNameIdx / LEAD_FIRST.length) % LEAD_LAST.length]}`;
    leadNameIdx++;
    return name;
  };

  PRODUCTS.forEach((productInfo, pi) => {
    const product = productInfo.id;
    const prodChar = PRODUCT_CHAR[product];
    const noAcctCompany = LEAD_COMPANIES[pi % LEAD_COMPANIES.length];

    // The "original" name that the duplicate-by-name lead will reuse. It belongs
    // to the first spec (index 0); every other non-dup spec gets a fresh name.
    let firstName = "";
    // The no-account "confirm/create" lead's work email, reused by the
    // email-duplicate lead so it's flagged on email rather than name.
    let sharedNoAcctEmail = "";

    LEAD_SPECS.forEach((spec, i) => {
      const accountId = spec.account
        ? `0015Y00000${prodChar}${LEAD_ACCOUNT_SLOT[spec.account].code}${pad3(LEAD_ACCOUNT_SLOT[spec.account].si)}`
        : null;
      const accountDomain = accountId ? accounts.find((a) => a.id === accountId)?.domain ?? null : null;

      let name: string;
      if (spec.dup === "name") {
        name = firstName; // duplicates the first lead's name -> Blocked by de-dupe
      } else {
        name = freshName();
        if (i === 0) firstName = name;
      }
      const emailLocal = name.trim().toLowerCase().split(/\s+/).join(".");

      // Company + email travel with every lead. Linked leads take their company
      // from the account (in the workability logic) and get a work email at the
      // account's domain; unlinked leads carry a standalone company + work email
      // so a domain can still be inferred without an account.
      let company: string | null = null;
      let email: string | null = null;
      if (accountId) {
        email = accountDomain ? `${emailLocal}@${accountDomain}` : null;
      } else {
        company = noAcctCompany.name;
        email = `${emailLocal}@${noAcctCompany.domain}`;
        if (i === 6) sharedNoAcctEmail = email; // original for the email-duplicate
      }
      if (spec.dup === "email") {
        company = noAcctCompany.name;
        email = sharedNoAcctEmail;
      }

      const score = Math.round(spec.fit * 0.4 + spec.intent * 0.35 + spec.workability * 0.25);

      sdrLeads.push({
        id: `00Q5Y0000${prodChar}DEMO${pad3(i)}`.slice(0, 18),
        name,
        title: spec.title,
        accountId,
        ownerName: spec.ownedByOther ? LEAD_OWNER.name : "House Account",
        status: "Open - Not Contacted",
        priorityGroup: spec.priority,
        product,
        fit: spec.fit,
        intent: spec.intent,
        workability: spec.workability,
        score,
        company,
        email,
        // Industry hint for no-account leads drives standalone-lead research
        // (Nonprofit -> ProPublica 990; otherwise ZoomInfo/LinkedIn intel).
        industry: accountId ? undefined : noAcctCompany.industry,
        // Every lead carries a marketing campaign source.
        source: LEAD_CAMPAIGNS[(pi * LEAD_SPECS.length + i) % LEAD_CAMPAIGNS.length],
      });
    });
  });

  return { accounts, contacts, opportunities, sdrLeads };
}

const generated = build();

export const DEMO_ACCOUNTS: Account[] = generated.accounts;
export const DEMO_CONTACTS: Contact[] = generated.contacts;
export const DEMO_OPPORTUNITIES: Opportunity[] = generated.opportunities;
export const DEMO_SDR_LEADS: SdrLead[] = generated.sdrLeads;
