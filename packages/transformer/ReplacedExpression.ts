import * as ts from "typescript";
import { PipeStep } from "./PipeStep";
import { pipe } from "fp-ts/lib/pipeable";
import * as A from "fp-ts/lib/Array";
import { toExpression as pipeStepToExpression } from "./PipeStep";

export type ReplacedExpression = {
  steps: PipeStep[];
  focus: ts.Expression;
};

export const replacedExpression = (
  steps: PipeStep[],
  focus: ts.Expression
): ReplacedExpression => ({
  steps,
  focus,
});

export const addStep = (p: PipeStep) => (
  replacement: ReplacedExpression
): ReplacedExpression =>
  replacedExpression([...replacement.steps, p], replacement.focus);

// ts.expression
export const toExpression = (r: ReplacedExpression): ts.CallExpression =>
  ts.createCall(ts.createIdentifier("pipe"), undefined, [
    r.focus,
    ...pipe(r.steps, A.map(pipeStepToExpression)),
  ]);
