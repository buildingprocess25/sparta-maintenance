import assert from "node:assert/strict";
import { UserRole } from "@prisma/client";
import { filterUsersByBranchAndRole } from "./recipients";

const users = [
    {
        NIK: "BMC-SDA",
        role: UserRole.BMC,
        branchNames: ["SIDOARJO"],
        deletedAt: null,
    },
    {
        NIK: "BMC-MLG",
        role: UserRole.BMC,
        branchNames: ["MALANG"],
        deletedAt: null,
    },
    {
        NIK: "BNM-SDA",
        role: UserRole.BNM_MANAGER,
        branchNames: ["SIDOARJO"],
        deletedAt: null,
    },
    {
        NIK: "BMC-DELETED",
        role: UserRole.BMC,
        branchNames: ["SIDOARJO"],
        deletedAt: new Date(),
    },
];

const bmc = filterUsersByBranchAndRole(users, "SIDOARJO", UserRole.BMC);
assert.deepEqual(
    bmc.map((user) => user.NIK),
    ["BMC-SDA"],
);

const bnm = filterUsersByBranchAndRole(
    users,
    "SIDOARJO",
    UserRole.BNM_MANAGER,
);
assert.deepEqual(
    bnm.map((user) => user.NIK),
    ["BNM-SDA"],
);

console.log("notification recipient tests passed");
