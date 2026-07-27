/**
 * A deterministic "contact cast" per account, shared by the Salesforce fixture
 * (on-file contacts) and the research layer (new finds). Because both sides read
 * the same cast, the Existing Contacts card and the "Contacts to work" row never
 * disagree, and ~78% of accounts show the full In-Salesforce / Inactive / New
 * mix that the hand-authored Halcyon Robotics account demonstrates — instead of
 * a single, repeated research find.
 *
 * Everything is derived from the account id via a stable hash (no randomness, no
 * dates), so ids, names, and titles are identical across runs — required, since
 * the mock store is seeded from these fixtures.
 *
 * `onFile` and `finds` draw first names from DISJOINT pools, so a find never
 * accidentally shares a full name with an on-file contact (which would drop it
 * from the "new" count). Collisions between the two are by TITLE only: when a
 * newer find holds the same title as an on-file contact, that on-file contact is
 * flagged "Inactive" (someone new now sits in the seat).
 */

export interface CastPerson {
  name: string;
  title: string;
}

export interface AccountContactCast {
  /** Finance contacts already in Salesforce for the account. */
  onFile: CastPerson[];
  /** New ICP finance contacts surfaced by research, not yet in Salesforce. */
  finds: CastPerson[];
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Disjoint first-name pools for on-file vs. found people, so a find and an
// on-file contact can never resolve to the same full name.
const ONFILE_FIRST = [
  "Dana", "Marcus", "Priya", "Tom", "Grace", "Julian", "Maya", "Owen",
  "Clara", "Nathan", "Ruby", "Simon", "Alice", "Victor", "Nina", "Leo",
  "Bianca", "Curtis", "Wendy", "Marco",
];
const FIND_FIRST = [
  "Sofia", "Elena", "Jordan", "Alex", "Sydney", "Devon", "Harper", "Rowan",
  "Emerson", "Sasha", "Cameron", "Palmer", "Noah", "Ivy", "Elliot", "Lena",
  "Theo", "Nadia", "Paige", "Hugo",
];
const LAST = [
  "Marin", "Park", "Wells", "Reyes", "Lin", "Shah", "Alvarez", "Monroe",
  "Ellis", "Sloane", "Blake", "Cole", "Nolan", "Hayes", "Reid", "Whitfield",
  "Chandler", "Bishop", "Ortiz", "Marsh", "Frost", "Bennett", "Cabrera",
  "Donovan", "Guerra", "Iqbal", "Han", "Okonkwo", "Petrov", "Suzuki",
];

// Senior finance titles used for the collision pair — an on-file holder plus a
// newer find with the same title (which flags the on-file row "Inactive").
const SENIOR_TITLES = ["CFO", "VP of Finance", "Controller", "Director of Finance"];
// Other on-file finance roles that stay active (no newer find in their seat).
const ACTIVE_TITLES = [
  "Staff Accountant",
  "Assistant Controller",
  "Accounting Manager",
  "Senior Accountant",
];
// Brand-new find roles with no on-file holder — plain New Contact rows.
const NEW_TITLES = [
  "VP Finance",
  "Director of Accounting",
  "Head of Finance",
  "Director of Financial Reporting",
  "Corporate Controller",
];

function nameFrom(firsts: string[], seed: string): string {
  const first = firsts[hash(`${seed}:f`) % firsts.length];
  const last = LAST[hash(`${seed}:l`) % LAST.length];
  return `${first} ${last}`;
}

function rotate<T>(arr: T[], by: number): T[] {
  const n = arr.length;
  const k = ((by % n) + n) % n;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

// Share of accounts that get the full Halcyon-style cast; the rest stay lean
// (0–1 on-file contact + a single new find) so contact depth — and workability
// scores — still vary across the worklist.
const RICH_THRESHOLD = 78;

export function accountContactCast(accountId: string): AccountContactCast {
  const rich = hash(`${accountId}:rich`) % 100 < RICH_THRESHOLD;

  if (!rich) {
    const onFile: CastPerson[] =
      hash(`${accountId}:leanof`) % 2 === 0
        ? [
            {
              name: nameFrom(ONFILE_FIRST, `${accountId}:of0`),
              title: ACTIVE_TITLES[hash(`${accountId}:leant`) % ACTIVE_TITLES.length],
            },
          ]
        : [];
    const finds: CastPerson[] = [
      {
        name: nameFrom(FIND_FIRST, `${accountId}:fd0`),
        title: NEW_TITLES[hash(`${accountId}:leanft`) % NEW_TITLES.length],
      },
    ];
    return { onFile, finds };
  }

  // Rich account: 1–2 title collisions (on-file + newer find), 1–2 active-only
  // on-file rows, and 1–2 brand-new finds — a varied Halcyon-style mix.
  const nColl = 1 + (hash(`${accountId}:nc`) % 2);
  const nActive = 1 + (hash(`${accountId}:na`) % 2);
  const nNew = 1 + (hash(`${accountId}:nn`) % 2);

  const collideTitles = rotate(SENIOR_TITLES, hash(`${accountId}:st`)).slice(0, nColl);
  const activeTitles = rotate(ACTIVE_TITLES, hash(`${accountId}:at`)).slice(0, nActive);
  const newTitles = rotate(NEW_TITLES, hash(`${accountId}:nt`)).slice(0, nNew);

  const onFileTitles = [...collideTitles, ...activeTitles];
  const findTitles = [...collideTitles, ...newTitles];

  const onFile = onFileTitles.map((title, k) => ({
    name: nameFrom(ONFILE_FIRST, `${accountId}:of${k}`),
    title,
  }));
  const finds = findTitles.map((title, k) => ({
    name: nameFrom(FIND_FIRST, `${accountId}:fd${k}`),
    title,
  }));

  return { onFile, finds };
}
