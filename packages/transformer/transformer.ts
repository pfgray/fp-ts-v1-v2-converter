import * as ts from "typescript";
import { Do } from "fp-ts-contrib/lib/Do";
import * as T from "@matechs/effect/lib/effect";
import { liftN, NarrowError } from "./helpers";
import { Replacement, pipeStep, PipeStep } from "./replacement";
import { pipe } from "fp-ts/lib/pipeable";
import * as A from "fp-ts/lib/Array";
import * as O from "fp-ts/lib/Option";
import { flow } from "fp-ts/lib/function";

const endsWith = function (s: string, suffix: string) {
  return s.indexOf(suffix, s.length - suffix.length) !== -1;
};

type Access<O, K> = K extends keyof O ? O[K] : never;

export const acc = <K extends string>(
  key: K
): (<O extends object>(o: O) => Access<O, K>) => (o) => (o as any)[key];

export function makeTransformer<N extends ts.Node>(
  program: ts.Program,
  source: ts.SourceFile,
  replacements: Replacement[]
): ts.TransformerFactory<N> {
  const checker = program.getTypeChecker();
  return (context: ts.TransformationContext) => {
    const visit: ts.Visitor = (node) => {
      // buildExpression: Expression
      //   buildExpressionFromSteps(steps)
      //     steps.map(s => s.name(visit(s.args)))
      //console.log("wuuuu");

      const rep = T.runSync(
        T.provide({ checker, replacements })(extractSteps(node))
      );
      if (rep._tag === "Done") {
        console.log("******");
        console.log("  From:");
        console.log(node.getFullText().trim());
        console.log("computed:");
        console.log(
          rep.value
            .map(
              (ps) =>
                `  ${ps.i}.${ps.method}(${ps.arguments
                  .map((a) => a.getFullText())
                  .join(", ")})`
            )
            .join("\n")
        );
        console.log("******");
      } else if (rep._tag === "Raise") {
        // console.log("uhh", rep.error);
      }

      return ts.visitEachChild(node, (child) => visit(child), context);
    };
    return (node) => ts.visitNode(node, visit);
  };
}

type ProgramContext = {
  checker: ts.TypeChecker;
  replacements: Replacement[];
};

// extractStep: Step[]
//   if node is replaceable,
//     [...extractStep, (build pipe step)]
//   if node is not replaceable
//     return the current steps
const extractSteps = (
  node: ts.Node
): T.Effect<
  never,
  ProgramContext,
  | NarrowError<ts.Node>
  | {
      tag: string;
    },
  PipeStep[]
> =>
  Do(T.effect)
    .sequenceS({
      ce: liftN(ts.isCallExpression, "call expression")(node),
    })
    .sequenceSL(({ ce }) => ({
      pa: liftN(ts.isPropertyAccessExpression, "propAccess")(ce.expression),
    }))
    .sequenceSL(({ ce, pa }) => ({
      r: findReplacement(pa, ce),
    }))
    .sequenceSL(({ pa }) => ({
      prevSteps: pipe(
        extractSteps(pa.expression),
        T.map(O.some),
        T.chainError(() => T.sync(() => O.none))
      ),
    }))
    .return(({ r, ce, pa, prevSteps }) => {
      // return a list of steps...
      console.log(
        "matched replacement: ",
        r.importName,
        "|",
        r.simpleTypeName,
        "||",
        pa.expression.getFullText().trim(),
        ";;",
        pa.name.getFullText().trim()
      );

      return pipe(
        prevSteps,
        O.getOrElse(() => [])
      ).concat(pipeStep(r.context, pa.name.getFullText().trim(), ce.arguments));
    });

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
        T.fromOption(() => ({ tag: "no_match" }))
      )
    )
  );
