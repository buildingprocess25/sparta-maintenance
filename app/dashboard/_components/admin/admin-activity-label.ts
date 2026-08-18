import { getActivityActionLabel } from "../../activity/activity-format";
import type { ActivityItem } from "../../queries";

export function getAdminRecentActivityLabel(
    activity: Pick<ActivityItem, "action" | "isChecklistOnly">,
): string {
    return getActivityActionLabel(activity.action, activity.isChecklistOnly);
}
