/* eslint-disable */
/**
 * PLACEHOLDER — regenerated (and committed) by `npx convex dev` / `npx convex codegen`
 * from schema.ts. Until then this is Convex's generic ("any") data model.
 */
import type { AnyDataModel, GenericId, GenericDocument } from 'convex/server';

export type DataModel = AnyDataModel;
export type TableNames = string;
export type Id<TableName extends TableNames = TableNames> = GenericId<TableName>;
export type Doc<_TableName extends TableNames = TableNames> = GenericDocument;
