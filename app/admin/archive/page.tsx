import { requireRole } from "@/lib/authorization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminArchivePage() {
    await requireRole("ADMIN");

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Arsip</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Fitur Segera Hadir</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Halaman arsip sedang dalam pengembangan dan akan segera
                        tersedia.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
