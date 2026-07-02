import assert from "node:assert/strict";
import { UserRole } from "@prisma/client";
import { filterUsersByBranchAndRole } from "./recipients";

const users = [
    {
        NIK: "BMC-SDA",
        role: UserRole.BMC,
        branchNames: ["SIDOARJO"],
        areaNames: ["SIDOARJO"],
        deletedAt: null,
    },
    {
        NIK: "BMC-SBY",
        role: UserRole.BMC,
        branchNames: ["SIDOARJO"],
        areaNames: ["SURABAYA"],
        deletedAt: null,
    },
    {
        NIK: "BMC-MLG",
        role: UserRole.BMC,
        branchNames: ["MALANG"],
        areaNames: ["MALANG"],
        deletedAt: null,
    },
    {
        NIK: "BNM-SDA",
        role: UserRole.BNM_MANAGER,
        branchNames: ["SIDOARJO"],
        areaNames: ["SIDOARJO"],
        deletedAt: null,
    },
    {
        NIK: "BMC-DELETED",
        role: UserRole.BMC,
        branchNames: ["SIDOARJO"],
        areaNames: ["SIDOARJO"],
        deletedAt: new Date(),
    },
];

const bmc = filterUsersByBranchAndRole(users, "SIDOARJO", UserRole.BMC);
assert.deepEqual(
    bmc.map((user) => user.NIK),
    ["BMC-SDA", "BMC-SBY"],
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

const areaBmc = filterUsersByBranchAndRole(
    users,
    "SIDOARJO",
    UserRole.BMC,
    ["SURABAYA"],
);
assert.deepEqual(
    areaBmc.map((user) => user.NIK),
    ["BMC-SBY"],
);

const fallbackBranchBmc = filterUsersByBranchAndRole(
    users,
    "SIDOARJO",
    UserRole.BMC,
    [],
);
assert.deepEqual(
    fallbackBranchBmc.map((user) => user.NIK),
    ["BMC-SDA", "BMC-SBY"],
);

console.log("notification recipient tests passed");
