import { test } from "node:test";
import assert from "node:assert/strict";
import { getLobbyistStats, getLobbyistsPage } from "../../src/lib/queries";
import { getForeignAid } from "../../src/lib/content";

test("lobbyist stats are populated", () => {
  const s = getLobbyistStats();
  assert.ok(s.lobbyists > 100, `expected many lobbyists, got ${s.lobbyists}`);
  assert.ok(s.firms > 0);
  assert.ok(s.clients > 0);
});

test("lobbyists list paginates and carries clients", () => {
  const all = getLobbyistsPage({});
  assert.ok(all.total > 100);
  assert.ok(all.items.length <= 25, "page size cap");
  assert.ok(all.items.some((l) => l.clients.length > 0), "some lobbyists have clients");
});

test("search narrows by lobbyist, firm, or client name", () => {
  const all = getLobbyistsPage({});
  const narrowed = getLobbyistsPage({ search: "בע" }); // common in Hebrew firm names (בע״מ)
  assert.ok(narrowed.total > 0 && narrowed.total <= all.total);
});

test("clients carry a representation type", () => {
  const { items } = getLobbyistsPage({});
  const withClients = items.find((l) => l.clients.length > 0);
  assert.ok(withClients, "expected a lobbyist with clients");
  for (const c of withClients!.clients) {
    assert.ok(["permanent", "temporary"].includes(c.type));
    assert.ok(c.name);
  }
});

test("foreign-aid: US military aid covers ~10 years, sourced & sorted", () => {
  const { usMilitaryAid } = getForeignAid();
  assert.ok(usMilitaryAid.years.length >= 10, "expected at least 10 years of US aid");
  assert.ok(/^https?:\/\//.test(usMilitaryAid.source.url));
  for (let i = 1; i < usMilitaryAid.years.length; i++) {
    assert.ok(usMilitaryAid.years[i - 1].year > usMilitaryAid.years[i].year, "newest-first");
  }
  for (const y of usMilitaryAid.years) assert.ok(y.billion > 0);
});

test("foreign-aid: standing flows include NGO donations, all sourced", () => {
  const { flows } = getForeignAid();
  assert.ok(flows.length >= 2);
  assert.ok(flows.some((f) => f.kind === "ngo-donations"), "expected an NGO-donations entry");
  for (const f of flows) {
    assert.ok(/^https?:\/\//.test(f.source.url), "every flow must cite a source URL");
    assert.ok(f.amount.he && f.amount.en);
  }
});
