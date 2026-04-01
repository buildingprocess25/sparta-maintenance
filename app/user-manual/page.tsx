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
    LogIn,
    KeyRound,
    ShieldCheck,
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
                description="Panduan Lengkap SPARTA Maintenance"
                showBackButton
                backHref="/"
            />

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Introduction */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-4">
                        Panduan Penggunaan Sistem SPARTA Maintenance
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Panduan lengkap untuk menggunakan sistem manajemen
                        pemeliharaan berdasarkan role pengguna.
                    </p>
                </div>

                {/* Login & Password */}
                <Card className="mb-8 border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LogIn className="h-5 w-5 text-primary" />
                            Login & Password
                        </CardTitle>
                        <CardDescription>
                            Cara masuk dan mengelola password akun Anda
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-start gap-3">
                            <KeyRound className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-foreground">
                                    Login Pertama Kali
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Gunakan email yang terdaftar dan{" "}
                                    <strong>nama cabang</strong> sebagai
                                    password awal. Contoh: jika cabang Anda
                                    &quot;JAKARTA PUSAT&quot;, masukkan
                                    &quot;JAKARTA PUSAT&quot; sebagai password.
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-foreground">
                                    Buat Password Baru
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Setelah login pertama, Anda akan diminta{" "}
                                    <strong>wajib membuat password baru</strong>{" "}
                                    (minimal 6 karakter). Password ini yang akan
                                    digunakan untuk login selanjutnya.
                                </p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-start gap-3">
                            <LogIn className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-foreground">
                                    Login Selanjutnya
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Gunakan email dan password baru yang telah
                                    Anda buat. Password bersifat{" "}
                                    <strong>case-sensitive</strong> (huruf besar
                                    dan kecil berbeda).
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* System Flow Overview */}
                <Card className="mb-8 border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Alur Sistem
                        </CardTitle>
                        <CardDescription>
                            Proses lengkap dari pelaporan hingga selesai
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-start gap-3">
                            <Badge variant="secondary" className="mt-1">
                                1
                            </Badge>
                            <div>
                                <p className="font-medium text-foreground">
                                    BMS membuat laporan kerusakan
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Upload foto, estimasi biaya, pilih toko dan
                                    jenis kerusakan
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
                                    BMC review estimasi
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Setujui, minta revisi, atau tolak estimasi
                                    biaya
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
                                    BMS melakukan perbaikan
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Mulai pekerjaan, upload foto sebelum/sesudah
                                    dan nota
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
                                    BMC review hasil pekerjaan
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Verifikasi hasil perbaikan, setujui atau
                                    minta revisi
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
                                    BnM Manager approval akhir (PJUM)
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Review dan approve/reject Pengajuan Uang
                                    Muka (PJUM)
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
                                <Badge className="mb-2">Draft</Badge>
                                <p className="text-sm text-muted-foreground">
                                    Laporan dalam proses pembuatan oleh BMS
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge
                                    variant="secondary"
                                    className="mb-2 bg-yellow-100 text-yellow-700 border-yellow-200"
                                >
                                    Menunggu Persetujuan Estimasi
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    BMS sudah submit, menunggu BMC review
                                    estimasi
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-green-100 text-green-700 border-green-200">
                                    Estimasi Disetujui
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    BMC menyetujui estimasi, BMS bisa mulai
                                    kerja
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-orange-100 text-orange-700 border-orange-200">
                                    Estimasi Ditolak (Revisi)
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    BMC minta revisi estimasi, BMS harus
                                    perbaiki dan submit ulang
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-red-100 text-red-700 border-red-200">
                                    Estimasi Ditolak
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    BMC menolak estimasi secara permanen,
                                    laporan ditutup
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-blue-100 text-blue-700 border-blue-200">
                                    Sedang Dikerjakan
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    BMS sedang mengerjakan perbaikan di lapangan
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-purple-100 text-purple-700 border-purple-200">
                                    Menunggu Review
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    BMS sudah selesai, menunggu BMC review hasil
                                    pekerjaan
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-orange-100 text-orange-700 border-orange-200">
                                    Penyelesaian Ditolak (Revisi)
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    BMC minta revisi hasil pekerjaan, BMS harus
                                    perbaiki
                                </p>
                            </div>
                            <div className="p-3 rounded-lg border bg-muted/50">
                                <Badge className="mb-2 bg-emerald-100 text-emerald-700 border-emerald-200">
                                    Selesai
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    BMC menyetujui hasil pekerjaan — laporan
                                    selesai
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

                    {/* BMS */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>
                                1. BMS (Building Maintenance Support)
                            </CardTitle>
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
                                        estimasi biaya, dan upload foto
                                        kerusakan
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Mulai Pekerjaan
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Setelah estimasi disetujui BMC, mulai
                                        proses perbaikan di lapangan
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Upload Bukti Pekerjaan
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Foto sebelum, sesudah, dan nota
                                        pembelian material
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Revisi Jika Ditolak
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Perbaiki estimasi atau hasil kerja
                                        sesuai catatan BMC, lalu submit ulang
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* BMC */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>
                                2. BMC (Building Maintenance Coordinator)
                            </CardTitle>
                            <CardDescription>
                                Review Estimasi & Hasil Pekerjaan
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Review Estimasi Biaya
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Periksa estimasi biaya dari BMS —
                                        setujui, minta revisi, atau tolak
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Review Hasil Pekerjaan
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Verifikasi foto, nota, dan hasil
                                        perbaikan — setujui atau minta revisi
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Buat Dokumen PJUM (Pertanggungjawaban
                                        Uang Muka)
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Rekap laporan selesai per BMS dan kirim
                                        ke BnM Manager untuk approval
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Manajemen BMS & Toko
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Tambah, edit, hapus data user dan toko
                                        di cabang Anda
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* BnM Manager */}
                    <Card className="border-2">
                        <CardHeader>
                            <CardTitle>
                                3. BnM Manager (Building & Maintenance Manager)
                            </CardTitle>
                            <CardDescription>
                                Approval Akhir & PJUM
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
                                        Lihat semua PJUM (Pengajuan Uang Muka)
                                        yang membutuhkan approval
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium">
                                        Approve / Reject PJUM
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Review detail pengajuan dan berikan
                                        keputusan akhir.
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
