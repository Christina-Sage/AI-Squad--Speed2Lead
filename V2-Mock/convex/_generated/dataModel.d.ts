/* eslint-disable */
/**
 * Generated data model types.
 *
 * THIS CODE IS GENERATED AUTOMATICALLY BY `npx convex dev` and is committed to
 * the repo. Hand-authored to match the standard template; a subsequent
 * `convex dev` regenerates it identically.
 *
 * @module
 */

import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  TableNamesInDataModel,
  SystemTableNames,
} from "convex/server";
import type { GenericId } from "convex/values";
import schema from "../schema.js";

/**
 * The names of all of your Convex tables.
 */
export type TableNames = TableNamesInDataModel<DataModel>;

/**
 * The type of a document stored in Convex.
 */
export type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>;

/**
 * An identifier for a document in Convex.
 */
export type Id<TableName extends TableNames | SystemTableNames> = GenericId<TableName>;

/**
 * A type describing your Convex data model.
 */
export type DataModel = DataModelFromSchemaDefinition<typeof schema>;
