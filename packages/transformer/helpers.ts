import * as T from "@matechs/effect/lib/effect";

export type NarrowError<A> = {
  tag: "narrowError";
  value: A;
  message: string;
};

export const liftN = <A, B extends A>(
  f: (a: A) => a is B,
  narrowLabel: string
) => (a: A): T.SyncE<NarrowError<A>, B> =>
  f(a)
    ? T.sync(() => a)
    : T.raiseError({
        tag: "narrowError",
        value: a,
        message: `Couldn't narrow value into: ${narrowLabel}`,
      });
