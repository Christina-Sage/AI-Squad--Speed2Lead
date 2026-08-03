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
import type * as accounts from "../accounts.js";
import type * as activities from "../activities.js";
import type * as auditLog from "../auditLog.js";
import type * as contacts from "../contacts.js";
import type * as opportunities from "../opportunities.js";
import type * as salesforceLeads from "../salesforceLeads.js";
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
  accounts: typeof accounts;
  activities: typeof activities;
  auditLog: typeof auditLog;
  contacts: typeof contacts;
  opportunities: typeof opportunities;
  salesforceLeads: typeof salesforceLeads;
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
