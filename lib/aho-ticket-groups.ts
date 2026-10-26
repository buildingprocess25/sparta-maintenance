import {
    REPORT_CHECKLIST_ITEMS,
    type AhoTicketGroup,
} from "@/lib/checklist-data";

export type AhoTicketHolder = {
    itemId: string;
    ahoTicketNumber?: string | null;
};

export type AhoTicketConflict = {
    itemId: string;
    ticket: string;
    reason: "used_by_other_item" | "group_ticket_mismatch";
};

const groupByItemId = new Map(
    REPORT_CHECKLIST_ITEMS.flatMap((item) =>
        item.ahoTicketGroup ? [[item.id, item.ahoTicketGroup] as const] : [],
    ),
);

export function getAhoTicketGroup(itemId: string): AhoTicketGroup | undefined {
    return groupByItemId.get(itemId);
}

// Item dalam satu grup berbagi "pemilik" tiket; item lain berdiri sendiri.
function getTicketOwner(itemId: string): string {
    const group = getAhoTicketGroup(itemId);
    return group ? `group:${group}` : `item:${itemId}`;
}

function normalizeTicket(ticket: string | null | undefined): string {
    return ticket?.trim() ?? "";
}

/** Tiket yang tidak boleh dipilih oleh `itemId` karena dimiliki pemilik lain. */
export function getLockedAhoTickets(
    itemId: string,
    holders: Iterable<AhoTicketHolder>,
): Set<string> {
    const owner = getTicketOwner(itemId);
    const locked = new Set<string>();

    for (const holder of holders) {
        const ticket = normalizeTicket(holder.ahoTicketNumber);
        if (!ticket || holder.itemId === itemId) continue;
        if (getTicketOwner(holder.itemId) !== owner) locked.add(ticket);
    }

    return locked;
}

/** Tiket yang sedang dipakai grup, untuk mengisi otomatis item grup lain. */
export function getGroupAhoTicket(
    group: AhoTicketGroup,
    holders: Iterable<AhoTicketHolder>,
    excludeItemId?: string,
): string | undefined {
    for (const holder of holders) {
        if (holder.itemId === excludeItemId) continue;
        if (getAhoTicketGroup(holder.itemId) !== group) continue;
        const ticket = normalizeTicket(holder.ahoTicketNumber);
        if (ticket) return ticket;
    }
    return undefined;
}

/**
 * Konflik pertama: satu tiket dipakai lebih dari satu pemilik, atau satu grup
 * memakai lebih dari satu tiket.
 */
export function findAhoTicketConflict(
    holders: readonly AhoTicketHolder[],
): AhoTicketConflict | null {
    const ownerByTicket = new Map<string, string>();
    const ticketByGroupOwner = new Map<string, string>();

    for (const holder of holders) {
        const ticket = normalizeTicket(holder.ahoTicketNumber);
        if (!ticket) continue;

        const owner = getTicketOwner(holder.itemId);
        if (owner.startsWith("group:")) {
            const groupTicket = ticketByGroupOwner.get(owner);
            if (groupTicket && groupTicket !== ticket) {
                return {
                    itemId: holder.itemId,
                    ticket,
                    reason: "group_ticket_mismatch",
                };
            }
            ticketByGroupOwner.set(owner, ticket);
        }

        const ticketOwner = ownerByTicket.get(ticket);
        if (ticketOwner && ticketOwner !== owner) {
            return {
                itemId: holder.itemId,
                ticket,
                reason: "used_by_other_item",
            };
        }
        ownerByTicket.set(ticket, owner);
    }

    return null;
}
