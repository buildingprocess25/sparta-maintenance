import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Home } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md text-center">
                <CardHeader className="pb-4">
                    {/* Logos */}
                    <div className="mx-auto mb-2 flex items-center gap-3">
                        <Image
                            src="/assets/Alfamart-Emblem.png"
                            alt="Alfamart"
                            width={120}
                            height={120}
                            className="h-7 w-auto object-contain"
                        />
                        <div className="h-5 w-px bg-border rounded-full" />
                        <div className="flex items-center gap-2">
                            <Image
                                src="/assets/Building-Logo.png"
                                alt="SPARTA Logo"
                                width={60}
                                height={60}
                                className="h-7 w-auto object-contain"
                            />
                            <div className="flex flex-col items-start leading-none">
                                <span className="font-bold text-sm tracking-wider text-foreground">
                                    SPARTA
                                </span>
                                <span className="text-[10px] text-muted-foreground font-light">
                                    Maintenance
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 404 */}
                    <div className="text-7xl font-extrabold text-muted-foreground/30 tracking-tighter py-2">
                        404
                    </div>

                    <CardTitle className="text-xl">
                        Halaman Tidak Ditemukan
                    </CardTitle>
                    <CardDescription className="text-base">
                        Halaman yang Anda cari tidak ada atau telah dipindahkan.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full" size="lg">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Kembali
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
