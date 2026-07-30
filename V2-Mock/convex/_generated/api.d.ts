/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS GENERATED AUTOMATICALLY BY `npx convex dev` and is committed to
 * the repo. Hand-authored to match the standard template; a subsequent
 * `convex dev` regenerates it identically.
 *
 * @module
 */

import type * as audit from "../audit.js";
import type * as overrides from "../overrides.js";
import type * as worklists from "../worklists.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  audit: typeof audit;
  overrides: typeof overrides;
  worklists: typeof worklists;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
