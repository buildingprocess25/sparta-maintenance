import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AdminLoading() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="h-8 w-40 rounded bg-muted animate-pulse mb-6" />
            <Card>
                <CardHeader>
                    <div className="h-6 w-44 rounded bg-muted animate-pulse" />
                </CardHeader>
                <CardContent>
                    <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
                </CardContent>
            </Card>
        </div>
    );
}
