import {
    Camera,
    ClipboardList,
    Receipt,
    Store,
    User,
    ImageIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { normalizePhotoUrls, resolvePhotoUrl } from "@/lib/storage/photo-url";
import type {
    ReportItemJson,
    MaterialEstimationJson,
    MaterialStoreJson,
    RealisasiItemJson
} from "@/types/report";
import { calculateItemRealisasiTotal } from "@/lib/realisasi";

type Props = {
    items: ReportItemJson[];
    estimations: MaterialEstimationJson[];
    startSelfieUrls: string[];
    startReceiptUrls: string[];
    startMaterialStores: MaterialStoreJson[];
    completionAdditionalPhotos: string[];
    completionAdditionalNote: string | null;
    formatCurrency: (n: number) => string;
    onPhotoClick: (src: string) => void;
};

function PhotoGrid({
    urls,
    onPhotoClick,
}: {
    urls: string[];
    onPhotoClick: (src: string) => void;
}) {
    const displayUrls = normalizePhotoUrls(urls)
        .map(resolvePhotoUrl)
        .filter((url) => url.length > 0);

    if (displayUrls.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {displayUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    key={`${url}-${i}`}
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border border-slate-200 shadow-sm hover:ring-2 hover:ring-[#0069a7] transition-all"
                    onClick={() => onPhotoClick(url)}
                />
            ))}
        </div>
    );
}

export function CompletionTabNew({
    items,
    estimations,
    startSelfieUrls,
    startReceiptUrls,
    startMaterialStores,
    completionAdditionalPhotos,
    completionAdditionalNote,
    formatCurrency,
    onPhotoClick,
}: Props) {
    const isZeroCost = Number(estimations.reduce((acc, curr) => acc + curr.totalPrice, 0)) === 0;

    const sections = [
        {
            title: "Selfie Mulai Pekerjaan",
            icon: <User className="h-4 w-4 text-[#0069a7]" />,
            content: (
                <div className="mt-3">
                    {startSelfieUrls.length > 0 ? (
                        <PhotoGrid urls={startSelfieUrls} onPhotoClick={onPhotoClick} />
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                            <ImageIcon className="h-4 w-4 shrink-0" />
                            <span>Tidak ada foto selfie</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            title: "Bukti Nota/Kwitansi",
            icon: <Receipt className="h-4 w-4 text-[#0069a7]" />,
            content: (
                <div className="mt-3">
                    {startReceiptUrls.length > 0 ? (
                        <PhotoGrid urls={startReceiptUrls} onPhotoClick={onPhotoClick} />
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                            <ImageIcon className="h-4 w-4 shrink-0" />
                            <span>
                                {isZeroCost
                                    ? "Dilewati (Estimasi Rp 0)"
                                    : "Tidak ada nota"}
                            </span>
                        </div>
                    )}
                </div>
            )
        },
        {
            title: "Daftar Toko Material",
            icon: <Store className="h-4 w-4 text-[#0069a7]" />,
            content: (
                <div className="mt-3">
                    {startMaterialStores.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {startMaterialStores.map((store, i) => (
                                <div key={i} className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="font-medium text-slate-800">{store.name}</div>
                                    {store.city && (
                                        <div className="text-slate-500 text-xs mt-1">{store.city}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
                            {isZeroCost
                                ? "Dilewati (Estimasi Rp 0)"
                                : "Tidak ada data toko"}
                        </div>
                    )}
                </div>
            )
        }
    ];

    const filledItems = items.filter((i) => i.condition || i.preventiveCondition);

    return (
        <div className="space-y-4 pb-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                        <Camera className="h-4 w-4 text-[#0069a7]" />
                        Bukti Persiapan
                    </h3>
                </div>
                <div className="p-4 flex flex-col gap-6">
                    {sections.map((section, idx) => (
                        <div key={idx}>
                            <h4 className="flex items-center gap-2 font-medium text-sm text-slate-700">
                                {section.icon}
                                {section.title}
                            </h4>
                            {section.content}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="text-base font-semibold flex items-center gap-2 text-slate-800">
                        <ClipboardList className="h-4 w-4 text-[#0069a7]" />
                        Realisasi Pekerjaan
                    </h3>
                </div>
                <div className="p-4 flex flex-col gap-4">
                    {filledItems.map((item) => {
                        const isDamaged = item.condition === "RUSAK" || item.preventiveCondition === "NOT_OK";
                        if (!isDamaged) return null;

                        const itemEstimations = estimations.filter(
                            (e) => e.itemId === item.itemId
                        );
                        const totalItemEst = itemEstimations.reduce((acc, curr) => acc + curr.totalPrice, 0);
                        const totalItemReal = calculateItemRealisasiTotal(item);

                        return (
                            <div key={item.itemId} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-start gap-2">
                                    <div className="font-medium text-sm text-slate-800">{item.itemName}</div>
                                </div>
                                <div className="p-3 flex flex-col gap-3">
                                    {/* Hasil Pengerjaan */}
                                    {item.afterImages && item.afterImages.length > 0 && (
                                        <div>
                                            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Foto Hasil Pengerjaan</div>
                                            <PhotoGrid urls={item.afterImages} onPhotoClick={onPhotoClick} />
                                        </div>
                                    )}

                                    {/* Material Terpakai */}
                                    {item.realisasiItems && item.realisasiItems.length > 0 && (
                                        <div>
                                            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Material Digunakan</div>
                                            <div className="bg-slate-50 border border-slate-100 rounded-lg divide-y divide-slate-100">
                                                {item.realisasiItems.map((mat: RealisasiItemJson, mIdx: number) => (
                                                    <div key={mIdx} className="p-2.5 flex justify-between items-center">
                                                        <div className="text-sm text-slate-700">
                                                            {mat.materialName} <span className="text-slate-400 text-xs ml-1">({mat.quantity} {mat.unit})</span>
                                                        </div>
                                                        <div className="font-mono text-sm font-medium text-slate-800">
                                                            {formatCurrency(mat.totalPrice)}
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="p-2.5 flex justify-between items-center bg-slate-100/50">
                                                    <div className="text-xs font-semibold text-slate-600">Total Material</div>
                                                    <div className="font-mono text-sm font-bold text-[#0069a7]">
                                                        {formatCurrency(totalItemReal)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {completionAdditionalPhotos.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-2">
                            <div className="bg-slate-50 p-3 border-b border-slate-200">
                                <div className="font-medium text-sm text-slate-800">Foto Tambahan</div>
                            </div>
                            <div className="p-3">
                                <PhotoGrid urls={completionAdditionalPhotos} onPhotoClick={onPhotoClick} />
                            </div>
                        </div>
                    )}
                    
                    {completionAdditionalNote && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white mt-2">
                            <div className="bg-slate-50 p-3 border-b border-slate-200">
                                <div className="font-medium text-sm text-slate-800">Catatan Tambahan</div>
                            </div>
                            <div className="p-3">
                                <p className="text-sm text-slate-600">{completionAdditionalNote}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
