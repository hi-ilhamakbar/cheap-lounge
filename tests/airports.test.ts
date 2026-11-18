import { test } from "node:test";
import assert from "node:assert/strict";
import { searchLocalAirports } from "../src/lib/airports.ts";

test("airport search by IATA, name and city", () => {
  for (const [q, iata] of [["CGK", "CGK"], ["sin", "SIN"], ["BKK", "BKK"], ["KUL", "KUL"], ["Soekarno", "CGK"], ["Changi", "SIN"], ["Suvarnabhumi", "BKK"], ["Kuala Lumpur", "KUL"]]) {
    assert.equal(searchLocalAirports(q)[0]?.iata, iata, q);
  }
  assert.deepEqual(searchLocalAirports("Jakarta").map((a) => a.iata).sort(), ["CGK", "HLP"]);
  assert.equal(searchLocalAirports("x").length, 0);
});
