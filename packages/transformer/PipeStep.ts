import * as ts from "typescript";
import { Context } from "./replacement";

export type PipeStep = {
  i: Context;
  method: string;
  arguments: Array<ts.Expression>;
};

export const pipeStep = (
  i: Context,
  method: string,
  args: Array<ts.Expression>
) => ({
  i,
  method,
  arguments: args,
});

export const toExpression = (p: PipeStep): ts.Expression =>
  ts.createCall(
    ts.createIdentifier(p.i + "." + p.method),
    undefined,
    p.arguments
  );
