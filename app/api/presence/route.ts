import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { markUserOnline, getOnlineUsers } from "@/lib/presence";

export async function POST() {
    try {
        const session = await getSession();
        // If not logged in, just ignore
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        // Update memory map
        markUserOnline(session.userId);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[PRESENCE_POST_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        const session = await getSession();
        // Secure it if needed (e.g., only logged in users or admins can see)
        if (!session?.userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        const onlineUsers = getOnlineUsers();
        return NextResponse.json({ onlineUsers });
    } catch (error) {
        console.error("[PRESENCE_GET_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
