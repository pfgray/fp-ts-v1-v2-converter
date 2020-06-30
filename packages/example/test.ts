import { Option, option, some } from "fp-ts/lib/Option";
import { Either, right } from "fp-ts/lib/Either";

type Hmm<A> = Either<string, A>;

declare const foo: Hmm<string>;

foo.map((a) => a.length);

right("sdf").map((a) => a.length);

some(5).map((a) => a + 4);
