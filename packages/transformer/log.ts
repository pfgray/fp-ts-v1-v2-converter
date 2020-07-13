export const log = (s: string) => <T>(t: T) => {
  console.log(s, t);
  return t;
};
export const logWith = <T>(f: (t: T) => string) => (t: T) => {
  console.log(f(t));
  return t;
};
