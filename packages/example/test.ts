import { Option, option, some, none } from "fp-ts/lib/Option";
import { Either, right } from "fp-ts/lib/Either";

type Hmm<A> = Either<string, A>;

declare const foo: Hmm<string>;

foo.map((a) => a.length);

right("sdf")
  .map((a) => a.length)
  .fold(() => none, some)
  .map((n) => n + 2);

some(5).map((a) => a + 4);
