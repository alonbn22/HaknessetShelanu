import { test } from "node:test";
import assert from "node:assert/strict";
import { getQuiz } from "../../src/lib/content";

const CURRENT_FACTIONS = [
  1096, 1102, 1095, 1110, 1105, 1101, 1106, 1104, 1103, 1099, 1108, 1100, 1107,
];

test("quiz has questions with localized text", () => {
  const qs = getQuiz();
  assert.ok(qs.length >= 8, "expected a meaningful number of questions");
  for (const q of qs) {
    assert.ok(q.text.he && q.text.en, `${q.id} missing he/en text`);
    assert.ok(q.text.ar && q.text.ru, `${q.id} missing ar/ru text`);
  }
});

test("every stance is a valid faction id with a value in -2..+2", () => {
  for (const q of getQuiz()) {
    for (const [id, val] of Object.entries(q.stances)) {
      assert.ok(
        CURRENT_FACTIONS.includes(Number(id)),
        `${q.id}: unknown faction ${id}`,
      );
      assert.ok(val >= -2 && val <= 2, `${q.id}/${id}: stance ${val} out of range`);
      assert.ok(Number.isInteger(val), `${q.id}/${id}: stance must be an integer`);
    }
  }
});

test("each question covers all 13 current factions", () => {
  for (const q of getQuiz()) {
    for (const f of CURRENT_FACTIONS) {
      assert.ok(
        q.stances[f] !== undefined,
        `${q.id} is missing a stance for faction ${f}`,
      );
    }
  }
});

test("question ids are unique", () => {
  const ids = getQuiz().map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate question id");
});
