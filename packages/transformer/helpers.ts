import * as T from "@matechs/effect/lib/effect";

export const liftN = <A, B extends A, E>(
  f: (a: A) => a is B,
  error: (a: A) => E
) => (a: A): T.SyncE<E, B> => (f(a) ? T.sync(() => a) : T.raiseError(error(a)));
