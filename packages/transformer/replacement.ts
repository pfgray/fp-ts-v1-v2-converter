import * as ts from "typescript";
import { ADT } from "ts-adt";

export type ReplacementResult = ADT<{
  replace: { expr: ts.Node; imports: ts.Expression[] };
  skip: { message: string };
}>;

export const replace = (
  expr: ts.Node,
  imports: ts.Expression[]
): ReplacementResult => ({
  _type: "replace",
  expr,
  imports,
});

type Context = "Option" | "Either";

export type PipeStep = {
  i: Context;
  method: string;
  arguments: ts.NodeArray<ts.Expression>;
};

export const pipeStep = (
  i: Context,
  method: string,
  args: ts.NodeArray<ts.Expression>
) => ({
  i,
  method,
  arguments: args,
});

export type Replacement = {
  simpleTypeName: string;
  importName: string;
  context: Context;
  // transform: (methodName: string, identifier: string) => PipeStep;
};
