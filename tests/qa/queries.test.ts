import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getDashboardStats,
  getMinisters,
  getAttendanceTable,
  getParticipationLeaderboard,
} from "../../src/lib/queries";

test("dashboard reports exactly 120 sitting MKs", () => {
  const { mks } = getDashboardStats();
  assert.equal(mks, 120, "the Knesset always has 120 sitting members");
});

test("minister count matches the ministers list and is plausible", () => {
  const { ministers } = getDashboardStats();
  const list = getMinisters();
  assert.equal(ministers, list.length);
  assert.ok(ministers > 10 && ministers < 40, `ministers=${ministers} out of expected range`);
});

test("attendance table includes only currently-serving members", () => {
  const rows = getAttendanceTable();
  assert.ok(rows.length > 0);
  assert.ok(rows.length <= 120, "never more than 120 serving members");
  for (const r of rows) {
    assert.equal(r.isSitting, true, `${r.person.lastNameHe} should be sitting`);
    assert.ok(r.participationPct >= 0 && r.participationPct <= 100);
  }
});

test("attendance is sorted by participation descending", () => {
  const rows = getAttendanceTable();
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i - 1].participationPct >= rows[i].participationPct);
  }
});

test("participation leaderboard contains only serving members", () => {
  const serving = new Set(getAttendanceTable().map((r) => r.personId));
  for (const order of ["top", "bottom"] as const) {
    const board = getParticipationLeaderboard(order, 5);
    assert.ok(board.length > 0);
    for (const entry of board) {
      assert.ok(
        serving.has(entry.personId),
        `${entry.person.lastNameHe} on the ${order} board is not a serving member`,
      );
    }
  }
});
