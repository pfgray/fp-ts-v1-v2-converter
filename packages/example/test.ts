import { Option, option, some, none } from "fp-ts/lib/Option";
import { Either, right } from "fp-ts/lib/Either";
import { identity } from "fp-ts/lib/function";

type Hmm<A> = Either<string, A>;

declare const foo: (s: Option<string>) => Hmm<string>;

foo(some("yoo"));

right(some("sdf"))
  .map((a) => a.map((n) => n.length))
  .fold(
    () => none,
    (a) => a.fold(none, some)
  )
  .map((n) => n + 2);
