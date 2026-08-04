import type { Account } from "@/lib/salesforce/types";
import { daysAgo } from "@/lib/salesforce/mock/fixtures/dates";

/**
 * Three-system de-dupe showcase accounts (dummy data). Each account replicates a
 * company matched across the three real source systems — GMO Salesforce (the
 * account itself), Intacct Salesforce, and SAP Fusion — via the embedded
 * `intacct` / `fusion` fields and the `customerProducts` ownership list, and is
 * built to land on exactly one verdict path:
 *
 *   1. Exact-product current customer            → NOT WORKABLE  (ABM: Current Customer)
 *   2. Customer of a different product           → WORKABLE WITH REVIEW (cross-sell)
 *   3. Former customer                           → WORKABLE WITH REVIEW (win-back)
 *   4. TAM segment ≠ worked segment (mismatch)   → WORKABLE WITH REVIEW
 *   5. Wrong vertical (construction, non-CRE)    → NOT WORKABLE  (ABM: Incorrect Vertical)
 *   6. Open opp sourced from Intacct SF          → NOT WORKABLE  (outbound)
 *   7. Clean prospect, segment matches           → WORKABLE
 *
 * Matching is deterministic here (explicit ownership / aligned fields); the real
 * fuzzy domain+name/geo matcher lands with real data.
 */
export const THREE_SYSTEM_ACCOUNTS: Account[] = [
  // 1. Current customer of the EXACT product being worked (Sage Intacct, held in
  // Intacct SF). Owns it already → hard block; engine sets ABM = Current Customer.
  {
    id: "0015Y0000TRISYS01",
    name: "Northwind Traders",
    domain: "northwind-traders.com",
    ownerId: "house",
    ownerName: "House Account",
    industry: "Wholesale Distribution",
    type: "Customer",
    product: "Intacct",
    tam: "Intacct",
    workedProduct: "Sage Intacct",
    customerProducts: [{ product: "Sage Intacct", system: "Intacct", status: "current" }],
    abmNurtureStatus: null,
    lastActivityDate: daysAgo(120),
    intacct: { hasOpenOpps: false, existingCustomerFlag: true, sageId: "SAGE-INTACCT-4471" },
  },

  // 2. Current customer of a DIFFERENT product in the same BMS segment: owns
  // Sage 100 (Fusion), being worked for Sage 300 → genuine cross-sell → review.
  {
    id: "0015Y0000TRISYS02",
    name: "Globex Manufacturing",
    domain: "globex-mfg.com",
    ownerId: "house",
    ownerName: "House Account",
    industry: "Manufacturing",
    type: "Customer",
    product: "BMS",
    tam: "BMS",
    workedProduct: "Sage 300",
    customerProducts: [{ product: "Sage 100", system: "Fusion", status: "current" }],
    abmNurtureStatus: null,
    lastActivityDate: daysAgo(95),
    intacct: { hasOpenOpps: false },
  },

  // 3. Former customer (churned off Sage X3, held in Fusion) → win-back → review.
  {
    id: "0015Y0000TRISYS03",
    name: "Initrode Systems",
    domain: "initrode.com",
    ownerId: "house",
    ownerName: "House Account",
    industry: "Technology",
    type: "Prospect",
    product: "X3",
    tam: "X3",
    workedProduct: "Sage X3",
    customerProducts: [{ product: "Sage X3", system: "Fusion", status: "former" }],
    abmNurtureStatus: null,
    lastActivityDate: daysAgo(200),
    intacct: { hasOpenOpps: false },
  },

  // 4. TAM territory names a different segment than the one being worked
  // (TAM=Intacct, worked as X3) → segment mismatch → review. Not a customer.
  {
    id: "0015Y0000TRISYS04",
    name: "Vandelay Industries",
    domain: "vandelay.com",
    ownerId: "house",
    ownerName: "House Account",
    industry: "Import/Export",
    type: "Prospect",
    product: "X3",
    tam: "Intacct",
    workedProduct: "Sage X3",
    abmNurtureStatus: null,
    lastActivityDate: daysAgo(80),
    intacct: { hasOpenOpps: false },
  },

  // 5. Wrong vertical: construction industry worked under BMS (a non-CRE
  // segment). Should route to CRE → blocks as a TAM/territory failure; engine
  // sets ABM = Incorrect Vertical.
  {
    id: "0015Y0000TRISYS05",
    name: "Summit Builders Group",
    domain: "summitbuilders.com",
    ownerId: "house",
    ownerName: "House Account",
    industry: "Construction",
    type: "Prospect",
    product: "BMS",
    tam: "BMS",
    workedProduct: "Sage 300",
    abmNurtureStatus: null,
    lastActivityDate: daysAgo(140),
    intacct: { hasOpenOpps: false },
  },

  // 6. Open opportunity sourced from Intacct SF (product-agnostic open-opp read
  // for an Intacct-SF product): an active Intacct deal means the account is
  // already being worked → outbound hard block. (Fusion has no opps, so a
  // non-Intacct product's open opp would instead live in GMO.)
  {
    id: "0015Y0000TRISYS06",
    name: "Stark Fabrication",
    domain: "starkfab.com",
    ownerId: "house",
    ownerName: "House Account",
    industry: "Industrial Equipment",
    type: "Prospect",
    product: "Intacct",
    tam: "Intacct",
    workedProduct: "Sage Intacct",
    abmNurtureStatus: null,
    lastActivityDate: daysAgo(45),
    intacct: {
      hasOpenOpps: true,
      openOppDetails: [
        {
          name: "Stark Fabrication — Sage Intacct Expansion",
          owner: "Dana Fields",
          createdBy: "Dana Fields",
          stage: "Negotiation",
          createdDate: daysAgo(25),
        },
      ],
    },
  },

  // 7. Clean prospect: segment matches, no ownership, no conflicts → workable.
  {
    id: "0015Y0000TRISYS07",
    name: "Wayne Enterprises",
    domain: "wayne-ent.com",
    ownerId: "house",
    ownerName: "House Account",
    industry: "Technology",
    type: "Prospect",
    product: "Intacct",
    tam: "Intacct",
    workedProduct: "Sage Intacct",
    abmNurtureStatus: null,
    lastActivityDate: daysAgo(220),
    intacct: { hasOpenOpps: false },
  },
];
