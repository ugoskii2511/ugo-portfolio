import { test } from "node:test";
import assert from "node:assert/strict";
import { unsubscribeToken, verifyUnsubscribe } from "../src/lib/unsubscribe-token";

// Value produced by prospector/app/mailer.py:
//   unsubscribe_token("cm1abc2def3ghi", "test-outreach-secret")
const PYTHON_TOKEN = "33e565fab59f240ecd5b00241a26c51b";

test("website and prospector sign unsubscribe links identically", () => {
  assert.equal(unsubscribeToken("cm1abc2def3ghi", "test-outreach-secret"), PYTHON_TOKEN);
});

test("unsubscribe tokens are verified strictly", () => {
  const secret = "test-outreach-secret";
  assert.equal(verifyUnsubscribe("cm1abc2def3ghi", PYTHON_TOKEN, secret), true);
  assert.equal(verifyUnsubscribe("cm1abc2def3ghj", PYTHON_TOKEN, secret), false); // another prospect
  assert.equal(verifyUnsubscribe("cm1abc2def3ghi", PYTHON_TOKEN, "other-secret"), false);
  assert.equal(verifyUnsubscribe("cm1abc2def3ghi", "not-a-token", secret), false);
  assert.equal(verifyUnsubscribe(undefined, PYTHON_TOKEN, secret), false);
  assert.equal(verifyUnsubscribe("cm1abc2def3ghi", PYTHON_TOKEN, ""), false); // no secret configured → never valid
});
