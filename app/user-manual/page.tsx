import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Users,
    FileText,
    CheckCircle,
    AlertCircle,
    ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function UserManualPage() {
    return (
        <div className="min-h-screen bg-background">
            <Header
                variant="dashboard"
                title="User Manual"
                description="Panduan Lengkap Sparta Maintenance"
                showBackButton
                backHref="/"
            />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Introduction */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-4">
                        Panduan Penggunaan Sistem Sparta Maintenance
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Panduan lengkap untuk menggunakan sistem manajemen
                        pemeliharaan berdasarkan role pengguna.
                    </p>
                </div>

                {/* System Flow Overview */}
                <Card className="mb-8 border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Alur Sistem
                        </CardTitle>
                        <CardDescription>
                            Proses lengkap dari pelaporan hingga approval
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-1">
                                1
                            </Badge>
                            <div>
                                <p className="font-medium text-foreground">
                                    Maintenance Support membuat laporan
                                    kerusakan
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Upload foto, estimasi biaya, lokasi
                                    kerusakan
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-1">
                                2
                            </Badge>
                            <div>
                                <p className="font-medium text-foreground">
                                    Pelaksanaan perbaikan & upload bukti
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Foto sebelum/sesudah, nota pembelian
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-1">
                                3
                            </Badge>
                            <div>
                                <p className="font-medium text-foreground">
                                    COS/ACOS verifikasi hasil di lapangan
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Cek material, nota, dan hasil perbaikan
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-1">
                                4
                            </Badge>
                            <div>
                                <p className="font-medium text-foreground">
                                    Coordinator monitoring & konfirmasi
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Pengecekan kelengkapan administratif
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-1">
                                5
                            </Badge>
                            <div>
                                <p className="font-medium text-foreground">
                                    Admin Building proses SPJ
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Generate dokumen dan arsip
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-1">
                                6
                            </Badge>
                            <div>
                                <p className="font-medium text-foreground">
                                    Manager approval akhir
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Review & approve/reject
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Status Laporan */}
                <Card className="mb-8 border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-primary" />
                            Status Laporan
                        </CardTitle>
                        <CardDescription>
                            Berbagai status dalam siklus hidup laporan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2">DRAFT</Badge>
                                <p className="text-sm text-muted-foreground">
                                    Laporan dalam proses pembuatan
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge variant="secondary" className="mb-2">
                                    OPEN
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    Laporan telah disubmit
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge variant="secondary" className="mb-2">
                                    ON_PROGRESS
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    Perbaikan sedang berlangsung
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge variant="secondary" className="mb-2">
                                    SOLVE
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    Perbaikan selesai, menunggu verifikasi
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge variant="destructive" className="mb-2">
                                    REVISION
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    Perlu perbaikan/revisi
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-green-600">
                                    APPROVED
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    Disetujui manager
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-blue-600">
                                    CLOSE
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    Laporan selesai & ditutup
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* User Guides by Role */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Panduan Per Role
                    </h3>

                    {/* Maintenance Support */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>1. Maintenance Support (MS)</CardTitle>
                            <CardDescription>
                                Pelapor & Pelaksana Perbaikan
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Buat Laporan Kerusakan
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Pilih toko, jenis kerusakan, lokasi,
                                        estimasi biaya, upload foto
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Lakukan Perbaikan
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Datang ke toko dan kerjakan perbaikan
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">Upload Bukti</p>
                                    <p className="text-sm text-muted-foreground">
                                        Foto sebelum, sesudah, dan nota
                                        pembelian
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* COS/ACOS */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>2. COS / ACOS</CardTitle>
                            <CardDescription>
                                Verifikasi Material & Hasil Perbaikan
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Lihat Laporan Toko
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Dashboard menampilkan laporan untuk toko
                                        Anda
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Verifikasi Lapangan
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Cek material, nota, dan hasil perbaikan
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Approve/Reject
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Setujui atau tolak dengan catatan
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Coordinator */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>3. Maintenance Coordinator</CardTitle>
                            <CardDescription>
                                Monitoring & Konfirmasi
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Dashboard Monitoring
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Lihat semua laporan dari berbagai toko
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Filter & Analisa
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Filter berdasarkan status, toko, atau
                                        periode
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Konfirmasi Kelengkapan
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Pastikan data lengkap sebelum ke Admin
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Admin */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>
                                4. Admin Building & Maintenance
                            </CardTitle>
                            <CardDescription>
                                Administrasi & SPJ
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Verifikasi Dokumen
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Cek nota asli, foto, dan kelengkapan
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">Generate SPJ</p>
                                    <p className="text-sm text-muted-foreground">
                                        Buat dokumen Surat Pertanggungjawaban
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Kirim ke Manager
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Forward untuk approval akhir
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manager */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>5. Manager</CardTitle>
                            <CardDescription>Approval Akhir</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Review Laporan & SPJ
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Periksa detail dan pertanggungjawaban
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Final Decision
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Approve untuk menutup atau reject untuk
                                        revisi
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CTA Section */}
                <div className="mt-12 text-center">
                    <Card className="border-2 border-primary/20 bg-primary/5">
                        <CardContent className="pt-6">
                            <ClipboardCheck className="h-12 w-12 text-primary mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-foreground mb-2">
                                Siap Menggunakan Sistem?
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Login sekarang dan mulai kelola maintenance
                                store Anda
                            </p>
                            <ButtonGroup
                                className="w-full max-w-sm mx-auto"
                                orientation="horizontal"
                            >
                                <Button asChild size="lg" className="flex-1">
                                    <Link href="/login">Login Sekarang</Link>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="flex-1"
                                    asChild
                                >
                                    <Link href="/">Kembali ke Home</Link>
                                </Button>
                            </ButtonGroup>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Footer />
        </div>
    );
}
