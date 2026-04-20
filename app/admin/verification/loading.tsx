import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminVerificationLoading() {
    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            <div className="h-8 w-32 rounded bg-muted animate-pulse" />
            <Card>
                <CardHeader>
                    <div className="h-6 w-44 rounded bg-muted animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="h-4 w-full rounded bg-muted animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                </CardContent>
            </Card>
        </div>
    );
}
