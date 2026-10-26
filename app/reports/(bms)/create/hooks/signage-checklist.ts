import type { ChecklistItem, SignageCondition } from "@/lib/checklist-data";
import {
    getAhoTicketGroup,
    getGroupAhoTicket,
    type AhoTicketHolder,
} from "@/lib/aho-ticket-groups";
import {
    SIGNAGE_NOT_AVAILABLE,
    isSignageDamaged,
    toChecklistCondition,
} from "@/lib/signage";

export type SignageChange =
    | { field: "material"; value: string }
    | { field: "condition"; value: SignageCondition | "" };

/** Turunkan pilihan signage ke field checklist lama (`condition`, `handler`). */
export function applySignageSelection(
    item: ChecklistItem,
    change: SignageChange,
): ChecklistItem {
    if (change.field === "material") {
        if (change.value === SIGNAGE_NOT_AVAILABLE) {
            return {
                ...item,
                signageMaterial: SIGNAGE_NOT_AVAILABLE,
                signageCondition: "",
                condition: "tidak_ada",
                handler: "",
                notes: undefined,
                ahoTicketNumber: undefined,
            };
        }

        const wasNotAvailable = item.signageMaterial === SIGNAGE_NOT_AVAILABLE;
        return {
            ...item,
            signageMaterial: change.value,
            ...(wasNotAvailable
                ? { signageCondition: "" as const, condition: "" as const }
                : {}),
        };
    }

    return {
        ...item,
        signageCondition: change.value,
        condition: toChecklistCondition(change.value),
        handler: isSignageDamaged(change.value) ? "Rekanan" : "",
    };
}

/** Holder tiket hanya dari item yang sedang rusak/NOT OK. */
export function toAhoTicketHolders(
    checklist: ReadonlyMap<string, ChecklistItem>,
): AhoTicketHolder[] {
    return Array.from(checklist.values())
        .filter((item) => item.condition === "rusak")
        .map((item) => ({
            itemId: item.id,
            ahoTicketNumber: item.ahoTicketNumber,
        }));
}

/** Item grup yang (baru) rusak memakai tiket grup yang sedang berlaku. */
export function fillGroupAhoTicket(
    checklist: Map<string, ChecklistItem>,
    itemId: string,
): Map<string, ChecklistItem> {
    const item = checklist.get(itemId);
    const group = getAhoTicketGroup(itemId);
    if (!item || !group || item.condition !== "rusak") return checklist;

    const ticket = getGroupAhoTicket(
        group,
        toAhoTicketHolders(checklist),
        itemId,
    );
    if (!ticket || ticket === item.ahoTicketNumber) return checklist;

    const next = new Map(checklist);
    next.set(itemId, { ...item, ahoTicketNumber: ticket });
    return next;
}

/** Samakan tiket semua item rusak di grup yang sama dengan item sumber. */
export function propagateGroupAhoTicket(
    checklist: Map<string, ChecklistItem>,
    sourceItemId: string,
): Map<string, ChecklistItem> {
    const source = checklist.get(sourceItemId);
    const group = getAhoTicketGroup(sourceItemId);
    if (!source || !group) return checklist;

    const next = new Map(checklist);
    for (const [id, item] of checklist) {
        if (id === sourceItemId || item.condition !== "rusak") continue;
        if (getAhoTicketGroup(id) !== group) continue;
        next.set(id, { ...item, ahoTicketNumber: source.ahoTicketNumber });
    }
    return next;
}
