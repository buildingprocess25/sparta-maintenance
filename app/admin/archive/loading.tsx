import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminArchiveLoading() {
    return (
        <div className="container mx-auto py-8 px-4 max-w-2xl">
            <Card>
                <CardHeader>
                    <div className="h-6 w-52 rounded bg-muted animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="h-4 w-full rounded bg-muted animate-pulse" />
                    <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                </CardContent>
            </Card>
        </div>
    );
}
