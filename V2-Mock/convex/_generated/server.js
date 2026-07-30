/* eslint-disable */
/**
 * Generated utilities for implementing server-side Convex query and mutation functions.
 *
 * THIS CODE IS GENERATED AUTOMATICALLY BY `npx convex dev` and is committed to
 * the repo. It was hand-authored to match the standard template so the project
 * type-checks before the first `convex dev` run; a subsequent `convex dev`
 * regenerates it identically. Do not edit by hand thereafter.
 *
 * @module
 */

import {
  actionGeneric,
  httpActionGeneric,
  queryGeneric,
  mutationGeneric,
  internalActionGeneric,
  internalMutationGeneric,
  internalQueryGeneric,
  componentsGeneric,
} from "convex/server";

/**
 * Define a query in this Convex app's public API.
 */
export const query = queryGeneric;

/**
 * Define a query that is only accessible from other Convex functions.
 */
export const internalQuery = internalQueryGeneric;

/**
 * Define a mutation in this Convex app's public API.
 */
export const mutation = mutationGeneric;

/**
 * Define a mutation that is only accessible from other Convex functions.
 */
export const internalMutation = internalMutationGeneric;

/**
 * Define an action in this Convex app's public API.
 */
export const action = actionGeneric;

/**
 * Define an action that is only accessible from other Convex functions.
 */
export const internalAction = internalActionGeneric;

/**
 * Define an HTTP action.
 */
export const httpAction = httpActionGeneric;

/**
 * The components installed in this Convex app.
 */
export const components = componentsGeneric();
