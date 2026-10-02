import { test } from "node:test";
import assert from "node:assert/strict";
import { RequestScope } from "../src/lib/requests";
test("logout rejects pending administrative loads and mutations", () => {
  const scope = new RequestScope();
  const read = scope.begin(),
    mutation = scope.capture();
  scope.invalidate();
  assert.equal(read.current(), false);
  assert.equal(read.sameScope(), false);
  assert.equal(mutation(), false);
  assert.equal(scope.begin().current(), true);
});
test("an older response cannot replace a newer load in the same session", () => {
  const scope = new RequestScope();
  const first = scope.begin(),
    second = scope.begin();
  assert.equal(first.current(), false);
  assert.equal(first.sameScope(), true);
  assert.equal(second.current(), true);
});
