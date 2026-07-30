import type { Account, AccountRating, Contact } from "@/lib/salesforce/types";
import type { SdrLead } from "@/lib/leads/types";
import type { Product } from "@/lib/products";
import type { PriorityGroup } from "@/lib/priority";
import { accountContactCast } from "@/lib/research/account-cast";

/**
 * VAR (partner) showcase leads for the SDR worklist — 5 per product line, each
 * linked to a found account that carries a partner relationship (Salesforce
 * Intacct varStatus or Sage Fusion partnerStatus). They exercise the Partner
 * (VAR) motion toggle and the In Review flag on the SDR side.
 *
 * The backing accounts are `worklistHidden` so they stay resolvable by id for
 * the leads without flooding the BDR account worklist (which would skew the
 * ~30% partner ratio there). Each account is a clean Prospect — active TAM, no
 * open opps, no ROE conflict — so its lead resolves to WORKABLE WITH REVIEW
 * (partner), not blocked.
 */
const PRODUCTS: Product[] = ["Intacct", "X3", "BMS", "S50", "CRE", "SSG"];

// 30 company bases (5 per product) + matching contacts, so nothing repeats.
const COMPANIES = [
  "Brightpath Systems", "Cedarline Group", "Harborview Partners", "Ironwood Labs", "Junction Bay Co",
  "Kestrel Dynamics", "Larkspur Health", "Meridian Peak", "Northwind Grove", "Oakmere Foods",
  "Pinehill Trust", "Quarry Ridge", "Redstone Works", "Silverbrook Care", "Thornhill Mfg",
  "Umber Field", "Vantage Point", "Westbrook Union", "Yellowstone Row", "Zephyr Lane",
  "Ashford Holdings", "Bramble & Co", "Coppergate", "Driftwood Supply", "Elmcrest Homes",
  "Fairhaven Aid", "Glenlake Metals", "Hollowoak", "Ivyridge Farms", "Juniper Court",
];
const CONTACTS: [string, string][] = [
  ["Nadia Alvarez", "Controller"], ["Marcus Bell", "VP Finance"], ["Priya Chandra", "Director of Finance"],
  ["Owen Doyle", "CFO"], ["Lena Frost", "Finance Manager"], ["Theo Grant", "Controller"],
  ["Amara Hale", "VP Finance"], ["Devon Iqbal", "Director of Finance"], ["Sofia Jansen", "CFO"],
  ["Caleb Koh", "Finance Manager"], ["Rina Lomax", "Controller"], ["Piotr Mensah", "VP Finance"],
  ["Bea Nolan", "Director of Finance"], ["Hugo Ortiz", "CFO"], ["Isla Park", "Finance Manager"],
  ["Jonah Quinn", "Controller"], ["Mila Reyes", "VP Finance"], ["Aidan Shaw", "Director of Finance"],
  ["Nova Tran", "CFO"], ["Elias Vance", "Finance Manager"], ["Farah Walsh", "Controller"],
  ["Gideon Xu", "VP Finance"], ["Hana York", "Director of Finance"], ["Ravi Zaman", "CFO"],
  ["Cora Adler", "Finance Manager"], ["Dario Boone", "Controller"], ["Elin Cho", "VP Finance"],
  ["Femi Dax", "Director of Finance"], ["Greta Ely", "CFO"], ["Haled Fox", "Finance Manager"],
];
const PARTNERS = ["Ridgeline Partners", "CloudServe", "Beacon Consulting", "Summit Channel", "Northgate Solutions"];
const INDUSTRIES = ["Manufacturing", "Nonprofit", "Healthcare", "Wholesale", "Construction"];
const PRIORITIES: PriorityGroup[] = ["P1", "P1", "P2/3", "P2/3", "P4/5"];
const RATING_BY_PRIORITY: Record<PriorityGroup, AccountRating> = { P1: "P1", "P2/3": "P2", "P4/5": "P3" };

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const VAR_ACCOUNTS: Account[] = [];
const VAR_SDR_LEADS: SdrLead[] = [];
// Existing (on-file) Salesforce contacts for each VAR account, drawn from the
// shared per-account cast so they coordinate with the research finds the same
// way generated demo accounts do — title collisions flag the on-file row
// "Inactive", the rest stay "In Salesforce". Without these the VAR account's
// Existing Contacts card would show research finds only (no in-Salesforce rows).
const VAR_CONTACTS: Contact[] = [];

PRODUCTS.forEach((product, pi) => {
  for (let j = 0; j < 5; j++) {
    const k = pi * 5 + j;
    const company = COMPANIES[k];
    const [contactName, title] = CONTACTS[k];
    const partner = PARTNERS[j];
    const domain = `${slug(company)}.com`;
    const priorityGroup = PRIORITIES[j];
    const accountId = `0015Y00000VR${pi}${j}01`;

    // Alternate the partner source so both Intacct and Fusion are represented,
    // with a registered (active deal reg) subset on each.
    const fromIntacct = j % 2 === 0;
    const registered = j === 0 || j === 1;
    const statusText = registered ? `Registered - ${partner}` : `Referred - ${partner}`;

    VAR_ACCOUNTS.push({
      id: accountId,
      name: company,
      domain,
      ownerId: "house",
      ownerName: "House Account",
      industry: INDUSTRIES[j],
      type: "Prospect",
      product,
      tam: product,
      rating: RATING_BY_PRIORITY[priorityGroup],
      abmNurtureStatus: null,
      lastActivityDate: null,
      intacct: fromIntacct
        ? { hasOpenOpps: false, varStatus: statusText }
        : { hasOpenOpps: false },
      ...(fromIntacct ? {} : { fusion: { partnerStatus: statusText } }),
      // Backs an SDR lead only — keep it out of the BDR account worklist.
      worklistHidden: true,
    });

    const [first, last] = contactName.split(" ");
    const fit = 58 + ((k * 7) % 30);
    const intent = 52 + ((k * 5) % 32);
    const workability = 56 + ((k * 3) % 26);
    VAR_SDR_LEADS.push({
      id: `00Q5Y00000VR${pi}${j}01`,
      name: contactName,
      title,
      accountId,
      ownerName: "House Account",
      status: "Open - Not Contacted",
      priorityGroup,
      product,
      fit,
      intent,
      workability,
      score: Math.round((fit + intent + workability) / 3),
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
      source: `Partner referral — ${partner}`,
    });

    // On-file contacts for this VAR account. The cast can be lean (0 on-file for
    // ~1-in-9 accounts); guarantee at least one so every VAR lead's Existing
    // Contacts card carries an in-Salesforce row, not just research finds.
    const onFile = accountContactCast(accountId).onFile;
    const seededOnFile =
      onFile.length > 0
        ? onFile
        : [{ name: `${CONTACTS[(k + 15) % CONTACTS.length][0]}`, title: "Accounting Manager" }];
    seededOnFile.forEach((person, ci) => {
      VAR_CONTACTS.push({
        id: `003-VR${pi}${j}-${ci}`,
        name: person.name,
        title: person.title,
        ownerId: "house",
        ownerName: "House Account",
        accountId,
        // No activity, so these never trip account-level ROE — they only add
        // depth to the Existing Contacts card (mirrors the demo-account cast).
        lastActivityDate: null,
      });
    });
  }
});

export { VAR_ACCOUNTS, VAR_SDR_LEADS, VAR_CONTACTS };
