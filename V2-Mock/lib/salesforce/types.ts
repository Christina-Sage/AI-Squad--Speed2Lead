import type { Product } from "@/lib/products";

export type AccountType = "Customer" | "Prospect" | "Partner" | string;

export type TamStatus = "Intacct" | "Expired Intacct TAM" | null;

/** 6sense Account Buying Stage, synced onto the Global SF account record. */
export type BuyingStage = "Target" | "Awareness" | "Consideration" | "Purchase" | "Decision";

/** Priority rating from the Rating field on the Global SF account record. */
export type AccountRating = "P1" | "P2" | "P3";

/** A marketing campaign an account has been touched by (6sense/ABM, events, nurture). */
export interface AccountCampaign {
  name: string;
  /** ISO date (YYYY-MM-DD) the account engaged with the campaign. */
  date: string;
}

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
  /** Sage product line this account is associated with — drives the dashboard product filter. */
  product: Product;
  tam: TamStatus;
  /** Parent account name, if this account rolls up to one (duplicate signal). */
  parentAccount?: string | null;
  /** Billing/HQ location or address (duplicate signal). */
  location?: string | null;
  /** 6sense Account Buying Stage from Global SF; null = not set. */
  buyingStage?: BuyingStage | null;
  /** Rating field from Global SF — drives the P1/P2/P3 priority tier. */
  rating?: AccountRating | null;
  /** Marketing campaigns that have touched this account; the most recent by date drives the "Marketing Campaign Source" field. */
  campaigns?: AccountCampaign[];
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
  /** Inherited from the linked account; filled when the bundle is loaded. */
  product?: Product;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  ownerId: string;
  ownerName: string;
  accountId: string;
  lastActivityDate: string | null;
  /** Inherited from the linked account; filled when the bundle is loaded. */
  product?: Product;
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
  /** Inherited from the linked account; filled when the bundle is loaded. */
  product?: Product;
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
  product: Product;
}
