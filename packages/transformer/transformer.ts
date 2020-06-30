import * as ts from "typescript";
import { Do } from "fp-ts-contrib/lib/Do";
import * as T from "@matechs/effect/lib/effect";
import { liftN } from "./helpers";
import { Replacement } from "./replacement";
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
    // const visit2: ts.Visitor = (node) => {
    //   pipe(
    //     liftN(ts.isCallExpression, "call expression")(node),
    //     T.chain(hmm => hmm)
    //   )
    // }
    const visit: ts.Visitor = (node) => {
      try {
        const eff = Do(T.effect)
          .sequenceS({
            ce: liftN(ts.isCallExpression, "call expression")(node),
          })
          .sequenceSL(({ ce }) => ({
            pa: liftN(
              ts.isPropertyAccessExpression,
              "propAccess"
            )(ce.expression),
          }))
          .bindL("r", ({ ce, pa }) =>
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
                    .return(
                      ({ symb }) => symb.escapedName === r.simpleTypeName
                    ),
                  O.getOrElse<boolean>(() => false)
                );
              }),
              T.fromOption(() => ({ tag: "no_match" }))
            )
          )
          .return(({ r, ce, pa }) => {
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

            return r.transform(
              pa.expression.getFullText().trim(),
              pa.name.getFullText().trim(),
              ce.arguments
            );
          });

        const rep = T.runSync(eff);
        if (rep._tag === "Done" && rep.value._type === "replace") {
          return rep.value.expr;
        }
      } catch (e) {
        console.log("Err!", e);
      }

      return ts.visitEachChild(node, (child) => visit(child), context);
    };
    return (node) => ts.visitNode(node, visit);
  };
}
