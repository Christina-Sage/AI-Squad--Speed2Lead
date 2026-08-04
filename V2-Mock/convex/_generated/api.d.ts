/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as accountOverrides from "../accountOverrides.js";
import type * as auditLog from "../auditLog.js";
import type * as fusionAccounts from "../fusionAccounts.js";
import type * as gmoAccounts from "../gmoAccounts.js";
import type * as gmoActivities from "../gmoActivities.js";
import type * as gmoContacts from "../gmoContacts.js";
import type * as gmoLeads from "../gmoLeads.js";
import type * as gmoOpportunities from "../gmoOpportunities.js";
import type * as intacctAccounts from "../intacctAccounts.js";
import type * as intacctActivities from "../intacctActivities.js";
import type * as intacctContacts from "../intacctContacts.js";
import type * as intacctOpportunities from "../intacctOpportunities.js";
import type * as savedWorklists from "../savedWorklists.js";
import type * as sdrLeads from "../sdrLeads.js";
import type * as validators from "../validators.js";
import type * as workItState from "../workItState.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  accountOverrides: typeof accountOverrides;
  auditLog: typeof auditLog;
  fusionAccounts: typeof fusionAccounts;
  gmoAccounts: typeof gmoAccounts;
  gmoActivities: typeof gmoActivities;
  gmoContacts: typeof gmoContacts;
  gmoLeads: typeof gmoLeads;
  gmoOpportunities: typeof gmoOpportunities;
  intacctAccounts: typeof intacctAccounts;
  intacctActivities: typeof intacctActivities;
  intacctContacts: typeof intacctContacts;
  intacctOpportunities: typeof intacctOpportunities;
  savedWorklists: typeof savedWorklists;
  sdrLeads: typeof sdrLeads;
  validators: typeof validators;
  workItState: typeof workItState;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
