export type AccountType = "Customer" | "Prospect" | "Partner" | string;

export type TamStatus = "Intacct" | "Expired Intacct TAM" | null;

/** 6sense Account Buying Stage, synced onto the Global SF account record. */
export type BuyingStage = "Target" | "Awareness" | "Consideration" | "Purchase" | "Decision";

/** Priority rating from the Rating field on the Global SF account record. */
export type AccountRating = "P1" | "P2" | "P3";

export interface IntacctFields {
  hasOpenOpps: boolean;
  openOppDetails?: {
    name: string;
    owner: string;
    stage: string;
    createdDate: string;
  }[];
  existingCustomerFlag?: boolean;
  sageId?: string;
  shellAccountStatus?: string;
  varStatus?: string;
}

export interface Account {
  id: string;
  name: string;
  domain: string;
  ownerId: string;
  ownerName: string;
  industry: string;
  type: AccountType;
  tam: TamStatus;
  /** Parent account name, if this account rolls up to one (duplicate signal). */
  parentAccount?: string | null;
  /** Billing/HQ location or address (duplicate signal). */
  location?: string | null;
  /** 6sense Account Buying Stage from Global SF; null = not set. */
  buyingStage?: BuyingStage | null;
  /** Rating field from Global SF — drives the P1/P2/P3 priority tier. */
  rating?: AccountRating | null;
  abmNurtureStatus: string | null;
  lastActivityDate: string | null;
  intacct: IntacctFields;
}

export interface Lead {
  id: string;
  name: string;
  title: string;
  ownerId: string;
  ownerName: string;
  status: string;
  accountId: string;
  lastActivityDate: string | null;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  ownerId: string;
  ownerName: string;
  accountId: string;
  lastActivityDate: string | null;
}

export interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  ownerId: string;
  ownerName: string;
  stage: string;
  isClosed: boolean;
  createdDate: string;
  /** Furthest stage the opp reached before closing — drives the DQ cooling-off rule. */
  furthestStage?: string;
  closedDate?: string | null;
}

export type ActivityType = "Call" | "Email" | "Meeting" | "Task";

export interface ActivityRecord {
  id: string;
  accountId: string;
  type: ActivityType;
  date: string;
  relatedToId?: string;
}

export interface AccountBundle {
  account: Account;
  leads: Lead[];
  contacts: Contact[];
  opportunities: Opportunity[];
  activities: ActivityRecord[];
}

export interface AccountSearchMatch {
  id: string;
  name: string;
  domain: string;
  ownerId: string;
  ownerName: string;
}

export interface AccountListItem extends AccountSearchMatch {
  type: AccountType;
  industry: string;
}
