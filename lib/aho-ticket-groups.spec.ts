import assert from "node:assert/strict";
import {
    findAhoTicketConflict,
    getAhoTicketGroup,
    getGroupAhoTicket,
    getLockedAhoTickets,
} from "./aho-ticket-groups";

assert.equal(getAhoTicketGroup("I11"), "signage");
assert.equal(getAhoTicketGroup("I12"), "signage");
assert.equal(getAhoTicketGroup("I13"), "signage");
assert.equal(getAhoTicketGroup("A22"), undefined);

const holders = [
    { itemId: "A22", ahoTicketNumber: "ABC" },
    { itemId: "I11", ahoTicketNumber: "BCD" },
    { itemId: "I13", ahoTicketNumber: " BCD " },
];

// Item non-signage: tiket semua item lain terkunci.
assert.deepEqual([...getLockedAhoTickets("A18", holders)].sort(), [
    "ABC",
    "BCD",
]);
// Tiket milik item itu sendiri tidak terkunci.
assert.equal(getLockedAhoTickets("A22", holders).has("ABC"), false);
assert.equal(getLockedAhoTickets("A22", holders).has("BCD"), true);
// Item signage: tiket grup bebas, tiket non-signage terkunci.
assert.deepEqual([...getLockedAhoTickets("I12", holders)], ["ABC"]);

assert.equal(getGroupAhoTicket("signage", holders), "BCD");
assert.equal(getGroupAhoTicket("signage", holders, "I11"), "BCD");
assert.equal(
    getGroupAhoTicket("signage", [{ itemId: "A1", ahoTicketNumber: "X" }]),
    undefined,
);

assert.equal(findAhoTicketConflict(holders), null);
assert.deepEqual(
    findAhoTicketConflict([
        { itemId: "A1", ahoTicketNumber: "X" },
        { itemId: "A2", ahoTicketNumber: "X" },
    ]),
    { itemId: "A2", ticket: "X", reason: "used_by_other_item" },
);
assert.deepEqual(
    findAhoTicketConflict([
        { itemId: "A1", ahoTicketNumber: "X" },
        { itemId: "I11", ahoTicketNumber: "X" },
    ]),
    { itemId: "I11", ticket: "X", reason: "used_by_other_item" },
);
assert.deepEqual(
    findAhoTicketConflict([
        { itemId: "I11", ahoTicketNumber: "X" },
        { itemId: "I12", ahoTicketNumber: "Y" },
    ]),
    { itemId: "I12", ticket: "Y", reason: "group_ticket_mismatch" },
);
assert.equal(
    findAhoTicketConflict([
        { itemId: "A1", ahoTicketNumber: "" },
        { itemId: "A2", ahoTicketNumber: "  " },
        { itemId: "A3", ahoTicketNumber: null },
    ]),
    null,
);

console.log("aho ticket group tests passed");
