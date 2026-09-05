/* eslint-disable */
/**
 * PLACEHOLDER — regenerated (and committed) by `npx convex dev` / `npx convex codegen`.
 *
 * Typed against Convex's generic builders. The concrete, schema-bound versions
 * (with your custom indexes) are written by codegen the first time you run
 * `npx convex dev`. Until then `convex/*.ts` will show "index not found" style
 * type errors when checked in isolation — that is expected and clears up after
 * codegen. The frontend does not depend on this file.
 */
import type {
  ActionBuilder,
  HttpActionBuilder,
  MutationBuilder,
  QueryBuilder,
  GenericQueryCtx,
  GenericMutationCtx,
  GenericActionCtx,
  GenericDatabaseReader,
  GenericDatabaseWriter,
} from 'convex/server';
import type { DataModel } from './dataModel';

export declare const query: QueryBuilder<DataModel, 'public'>;
export declare const internalQuery: QueryBuilder<DataModel, 'internal'>;
export declare const mutation: MutationBuilder<DataModel, 'public'>;
export declare const internalMutation: MutationBuilder<DataModel, 'internal'>;
export declare const action: ActionBuilder<DataModel, 'public'>;
export declare const internalAction: ActionBuilder<DataModel, 'internal'>;
export declare const httpAction: HttpActionBuilder;

export type QueryCtx = GenericQueryCtx<DataModel>;
export type MutationCtx = GenericMutationCtx<DataModel>;
export type ActionCtx = GenericActionCtx<DataModel>;
export type DatabaseReader = GenericDatabaseReader<DataModel>;
export type DatabaseWriter = GenericDatabaseWriter<DataModel>;
