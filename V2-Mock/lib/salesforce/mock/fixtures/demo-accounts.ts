import type { Account, Contact, Opportunity } from "@/lib/salesforce/types";
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

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

interface Generated {
  accounts: Account[];
  contacts: Contact[];
  opportunities: Opportunity[];
}

function build(): Generated {
  const accounts: Account[] = [];
  const contacts: Contact[] = [];
  const opportunities: Opportunity[] = [];

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
        tam: "Intacct",
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
        accounts.push({ ...base, tam: "Expired Intacct TAM" });
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
          // A disqualified opp that reached Discovery+ and closed inside the
          // 6-month cooling-off window.
          accounts.push(base);
          const closed = 30 + (g % 5) * 25; // 30..130 days ago (< 6 months)
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

  return { accounts, contacts, opportunities };
}

const generated = build();

export const DEMO_ACCOUNTS: Account[] = generated.accounts;
export const DEMO_CONTACTS: Contact[] = generated.contacts;
export const DEMO_OPPORTUNITIES: Opportunity[] = generated.opportunities;
