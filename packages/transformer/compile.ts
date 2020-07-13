import * as ts from "typescript";
import { makeTransformer } from "./transformer";

import { highlight } from "cli-highlight";
import { Replacement, replace } from "./replacement";

const program = ts.createProgram(["../example/test.ts"], {});
const source = program.getSourceFile("../example/test.ts");

const replacements: Replacement[] = [
  {
    importName: "fp-ts/lib/Either.d.ts",
    simpleTypeName: "Either",
    context: "Either",
  },
  {
    importName: "fp-ts/lib/Option.d.ts",
    simpleTypeName: "Option",
    context: "Option",
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
