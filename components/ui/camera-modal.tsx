"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
    watermarkInfo?: {
        name: string;
        nik: string;
        role: string;
        storeInfo: string;
    };
}

export function CameraModal({
    isOpen,
    onClose,
    onCapture,
    watermarkInfo,
}: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">(
        "environment",
    );
    const [permissionError, setPermissionError] = useState(false);

    // Start Camera
    const startCamera = async () => {
        try {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: false,
            });

            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            setPermissionError(false);
        } catch (err) {
            console.error("Camera Error:", err);
            setPermissionError(true);
            toast.error("Gagal mengakses kamera. Pastikan izin diberikan.");
        }
    };

    // Stop Camera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    // Initialize/Cleanup
    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, facingMode]);

    // Handle Capture Photo
    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext("2d");
            if (context) {
                // Flip horizontal if using front camera for natural mirror effect
                if (facingMode === "user") {
                    context.translate(canvas.width, 0);
                    context.scale(-1, 1);
                }

                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Revert flip after image drawing so text isn't mirrored!
                if (facingMode === "user") {
                    context.scale(-1, 1);
                    context.translate(-canvas.width, 0);
                }

                // ==============================
                // DRAW WATERMARK
                // ==============================
                const isLandscape = canvas.width > canvas.height;
                const fontScale = isLandscape ? 0.02 : 0.035;
                const paddingScale = isLandscape ? 0.012 : 0.02;

                const padding = Math.max(
                    12,
                    Math.floor(canvas.width * paddingScale),
                );
                const fontSize = Math.max(
                    12,
                    Math.floor(canvas.width * fontScale),
                );
                context.textBaseline = "bottom";

                const textAppName = "SPARTA Maintenance";
                const textTime = new Date().toLocaleString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                });

                let textUser = "";
                let textLocation = "";

                if (watermarkInfo) {
                    textUser = `Oleh: ${watermarkInfo.name} (${watermarkInfo.nik}) - ${watermarkInfo.role}`;
                    textLocation = watermarkInfo.storeInfo;
                }

                const smallerFont = Math.floor(fontSize * 0.8);
                const lineGap = fontSize * (isLandscape ? 0.25 : 0.4);
                const outlineWidth = Math.max(1, Math.floor(fontSize * 0.08));

                // Helper: draw text with outline for readability
                const drawOutlinedText = (
                    text: string,
                    x: number,
                    y: number,
                    font: string,
                ) => {
                    context.font = font;
                    context.textAlign = "right";
                    context.lineWidth = outlineWidth;
                    context.strokeStyle = "rgba(0, 0, 0, 0.7)";
                    context.lineJoin = "round";
                    context.shadowColor = "rgba(0, 0, 0, 0.5)";
                    context.shadowBlur = fontSize * 0.3;
                    context.shadowOffsetX = 1;
                    context.shadowOffsetY = 1;
                    context.strokeText(text, x, y);
                    context.shadowBlur = 0;
                    context.shadowOffsetX = 0;
                    context.shadowOffsetY = 0;
                    context.fillStyle = "#ffffff";
                    context.fillText(text, x, y);
                };

                let currentY = canvas.height - padding;
                const textX = canvas.width - padding;

                if (textLocation) {
                    drawOutlinedText(
                        textLocation,
                        textX,
                        currentY,
                        `normal ${smallerFont}px sans-serif`,
                    );
                    currentY -= smallerFont + lineGap;
                }

                if (textUser) {
                    drawOutlinedText(
                        textUser,
                        textX,
                        currentY,
                        `normal ${smallerFont}px sans-serif`,
                    );
                    currentY -= smallerFont + lineGap;
                }

                drawOutlinedText(
                    textTime,
                    textX,
                    currentY,
                    `normal ${smallerFont}px sans-serif`,
                );
                currentY -= smallerFont + lineGap;

                drawOutlinedText(
                    textAppName,
                    textX,
                    currentY + (fontSize - smallerFont),
                    `bold ${fontSize}px sans-serif`,
                );

                // Convert to File
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const file = new File(
                                [blob],
                                `photo_${Date.now()}.jpg`,
                                { type: "image/jpeg" },
                            );
                            onCapture(file);
                            onClose();
                        }
                    },
                    "image/jpeg",
                    0.8,
                );
            }
        }
    };

    const toggleCamera = () => {
        setFacingMode((prev) =>
            prev === "environment" ? "user" : "environment",
        );
    };

    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const mql = window.matchMedia("(orientation: landscape)");
        setIsLandscape(mql.matches);
        const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-100 bg-black flex ${isLandscape ? "flex-row" : "flex-col"}`}
        >
            {/* Left sidebar (landscape) / Top bar (portrait) — Close & Switch */}
            {isLandscape ? (
                <div className="w-16 flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-sm z-10">
                    <Button
                        variant="ghost"
                        size="icon-lg"
                        className="text-white hover:bg-white/20 rounded-full"
                        onClick={onClose}
                    >
                        <X className="h-8 w-8" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-lg"
                        className="text-white hover:bg-white/20 rounded-full"
                        onClick={toggleCamera}
                    >
                        <SwitchCamera className="h-8 w-8" />
                    </Button>
                </div>
            ) : (
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-linear-to-b from-black/50 to-transparent">
                    <Button
                        variant="ghost"
                        size="icon-lg"
                        className="text-white hover:bg-white/20 rounded-full"
                        onClick={onClose}
                    >
                        <X className="h-15 w-15" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-lg"
                        className="text-white hover:bg-white/20 rounded-full"
                        onClick={toggleCamera}
                    >
                        <SwitchCamera className="h-15 w-15" />
                    </Button>
                </div>
            )}

            {/* Main Camera View */}
            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                {permissionError ? (
                    <div className="text-white text-center p-6">
                        <p className="mb-4">
                            Akses kamera ditolak atau tidak tersedia.
                        </p>
                        <Button onClick={onClose} variant="secondary">
                            Tutup Kamera
                        </Button>
                    </div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
                    />
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Right sidebar (landscape) / Bottom bar (portrait) — Shutter */}
            {isLandscape ? (
                <div className="w-24 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="relative group">
                        <button
                            onClick={handleCapture}
                            className="h-16 w-16 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-95 group-hover:bg-white/10"
                        >
                            <div className="h-12 w-12 bg-white rounded-full" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-black/80 p-6 pb-8 backdrop-blur-sm">
                    <div className="flex items-center justify-center max-w-md mx-auto">
                        <div className="relative group">
                            <button
                                onClick={handleCapture}
                                className="h-20 w-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-95 group-hover:bg-white/10"
                            >
                                <div className="h-16 w-16 bg-white rounded-full" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
