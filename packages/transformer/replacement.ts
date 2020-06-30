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

export type Replacement = {
  simpleTypeName: string;
  importName: string;
  transform: (
    methodName: string,
    identifier: string,
    args: ts.NodeArray<ts.Expression>
  ) => ReplacementResult;
};
