import * as ts from "typescript";
import { makeTransformer } from "./transformer";

import { highlight } from "cli-highlight";
import { Replacement, replace } from "./replacement";

const program = ts.createProgram(["../example/test.ts"], {});
const source = program.getSourceFile("../example/test.ts");

const replacements: Replacement[] = [
  {
    importName: "fp-ts/lib/Either.d.ts",
    transform: (m, id, args) =>
      replace(
        ts.createCall(ts.createIdentifier("pipe"), undefined, [
          ts.createIdentifier(m),
          ts.createCall(ts.createIdentifier("E." + id), undefined, args),
        ]),
        []
      ),
    simpleTypeName: "Either",
  },
  {
    importName: "fp-ts/lib/Option.d.ts",
    transform: (m, id, args) =>
      replace(
        ts.createCall(ts.createIdentifier("pipe"), undefined, [
          ts.createIdentifier(m),
          ts.createCall(ts.createIdentifier("O." + id), undefined, args),
        ]),
        []
      ),
    simpleTypeName: "Option",
  },
];

if (source) {
  const result = ts.transform(source, [
    makeTransformer(program, source, replacements),
  ]);

  console.log("/** Transforming: **/");
  console.log(
    highlight(ts.createPrinter().printFile(source), {
      language: "typescript",
    })
  );
  console.log("/** Into: **/");
  console.log(
    highlight(ts.createPrinter().printFile(result.transformed[0]), {
      language: "typescript",
    })
  );
  console.log("/****/");
} else {
  console.log("couldnt find test.ts");
}

// Couldn't derive instance for type: User,
// No Type<Date> found for path:
// User
//  └─image
//    └─src
