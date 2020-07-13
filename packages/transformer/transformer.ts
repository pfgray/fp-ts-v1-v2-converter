import * as ts from "typescript";
import { Do } from "fp-ts-contrib/lib/Do";
import * as T from "@matechs/effect/lib/effect";
import { liftN } from "./helpers";
import { Replacement } from "./replacement";
import { pipe } from "fp-ts/lib/pipeable";
import * as A from "fp-ts/lib/Array";
import * as O from "fp-ts/lib/Option";
import { flow } from "fp-ts/lib/function";
import {
  ReplacedExpression,
  replacedExpression,
  addStep,
  toExpression,
} from "./ReplacedExpression";
import { unreplaceable, NonExpressionFound, Unreplaceable } from "./errors";
import { pipeStep } from "./PipeStep";
import { log } from "./log";

const endsWith = function (s: string, suffix: string) {
  return s.indexOf(suffix, s.length - suffix.length) !== -1;
};

type Access<O, K> = K extends keyof O ? O[K] : never;

export const acc = <K extends string>(
  key: K
): (<O extends object>(o: O) => Access<O, K>) => (o) => (o as any)[key];

type HomomorphicVisitor = (node: ts.Node) => ts.Node;

export function makeTransformer<N extends ts.Node>(
  program: ts.Program,
  source: ts.SourceFile,
  replacements: Replacement[]
): ts.TransformerFactory<N> {
  const checker = program.getTypeChecker();
  return (context: ts.TransformationContext) => {
    const visit = (node: ts.Node) => {
      const rep = T.runSync(
        T.provide({ checker, replacements, context })(
          attemptReplacement(node, visit)
        )
      );
      if (rep._tag === "Done" && rep.value.steps.length > 0) {
        return toExpression(rep.value);
      } else if (rep._tag === "Raise") {
        return ts.visitEachChild(node, (child) => visit(child), context);
      }
    };
    return (node) => ts.visitNode(node, visit);
  };
}

//  visit
//    const [replaced] = attemptReplace
//    if replaced, return, otherwise
//    otherwise, recurse!

//  attemptReplace: Unreplaceable | Node
//    const [steps, focus] = extract the steps
//    for each step, visit the arguments,
//    visit the focus
//    construct the expression

// extractStep: Replacement
//   if node is replaceable,
//     [...extractStep, (build pipe step)]
//   if node is not replaceable
//     return the current steps

type ProgramContext = {
  checker: ts.TypeChecker;
  replacements: Replacement[];
  context: ts.TransformationContext;
};

/**
 * Attempts to replace a Node
 * with a ReplacedExpression, but can fail with 'unreplaceable'
 * @param node
 * @param visit
 */
const attemptReplacement = (
  node: ts.Node,
  visit: HomomorphicVisitor
): T.Effect<never, ProgramContext, Unreplaceable, ReplacedExpression> =>
  extractReplacement(node)
    .sequenceSL(({ ce }) => ({
      steps: extractSteps(ce, visit),
    }))
    .return(({ steps }) => steps);

const extractCallExpression = liftN(
  ts.isCallExpression,
  unreplaceable("not call expression")
);

const extractReplacement = (node: ts.Node) =>
  Do(T.effect)
    .sequenceS({
      ce: extractCallExpression(node),
    })
    .sequenceSL(({ ce }) => ({
      pa: liftN(
        ts.isPropertyAccessExpression,
        unreplaceable("not property access")
      )(ce.expression),
    }))
    .sequenceSL(({ ce, pa }) => ({
      r: findReplacement(pa, ce),
    }));

const extractSteps = (
  node: ts.Expression,
  visit: HomomorphicVisitor
): T.Effect<never, ProgramContext, never, ReplacedExpression> =>
  pipe(
    log("Looking at:")(node.getFullText().trim()),
    () =>
      extractReplacement(node)
        .sequenceSL(({ pa }) => ({
          prevSteps: extractSteps(pa.expression, visit),
        }))
        .return(({ r, ce, pa, prevSteps }) =>
          pipe(
            prevSteps,
            addStep(
              pipeStep(
                r.context,
                pa.name.getFullText().trim(),
                (ce.arguments.map(visit) as any) as ts.Expression[]
              )
            )
          )
        ),
    T.chainError((err) => {
      console.log("unreplaceable:", err.reason, err.node.getFullText().trim());
      console.log("asdfff", node.getFullText().trim());
      return pipe(
        T.access<ProgramContext, ReplacedExpression>(({ context }) =>
          replacedExpression(
            [],
            ts.visitEachChild(node, (child) => visit(child), context)
          )
        )
      );
    })
  );

const findReplacement = (
  pa: ts.PropertyAccessExpression,
  ce: ts.CallExpression
) =>
  pipe(
    T.accessEnvironment<ProgramContext>(),
    T.chain(({ replacements, checker }) =>
      pipe(
        replacements,
        A.findFirst((r) => {
          const typ = checker.getTypeAtLocation(pa.expression);
          return pipe(
            Do(O.option)
              .bind("symb", O.fromNullable(typ.aliasSymbol))
              .bindL("decs", ({ symb }) =>
                O.fromNullable(symb.getDeclarations())
              )
              .bindL(
                "dec",
                flow(
                  acc("decs"),
                  A.findFirst((d) =>
                    endsWith(d.getSourceFile().fileName, r.importName)
                  )
                )
              )
              .return(({ symb }) => symb.escapedName === r.simpleTypeName),
            O.getOrElse<boolean>(() => false)
          );
        }),
        T.fromOption(() =>
          unreplaceable("Not listed as replaceable")(ce.expression)
        )
      )
    )
  );
