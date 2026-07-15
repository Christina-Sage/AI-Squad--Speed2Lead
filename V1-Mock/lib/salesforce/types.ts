export type AccountType = "Customer" | "Prospect" | "Partner" | string;

export type TamStatus = "Intacct" | "Expired Intacct TAM" | null;

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
