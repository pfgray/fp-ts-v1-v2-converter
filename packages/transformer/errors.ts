import * as ts from "typescript";

export type Unreplaceable = {
  tag: "unreplaceable";
  node: ts.Node;
  reason?: string;
};

export const unreplaceable = (reason?: string) => (
  node: ts.Node
): Unreplaceable => ({
  tag: "unreplaceable",
  reason,
  node,
});

export type NonExpressionFound = {
  tag: "NonExpressionFound";
  node: ts.Node;
};

export const nonExpressionFound = (node: ts.Node): NonExpressionFound => ({
  tag: "NonExpressionFound",
  node,
});
