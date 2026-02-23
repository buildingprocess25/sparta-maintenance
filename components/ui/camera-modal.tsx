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
                const padding = Math.max(20, Math.floor(canvas.width * 0.02));
                const fontSize = Math.max(16, Math.floor(canvas.width * 0.035)); // responsive font
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

                // Set font to measure texts
                context.font = `bold ${fontSize}px sans-serif`;
                let maxWidth = context.measureText(textAppName).width;

                context.font = `normal ${Math.floor(fontSize * 0.8)}px sans-serif`;
                maxWidth = Math.max(
                    maxWidth,
                    context.measureText(textTime).width,
                );
                if (textUser)
                    maxWidth = Math.max(
                        maxWidth,
                        context.measureText(textUser).width,
                    );
                if (textLocation)
                    maxWidth = Math.max(
                        maxWidth,
                        context.measureText(textLocation).width,
                    );

                const textHeight = fontSize;
                const lineGap = textHeight * 0.4;

                // Calculate total height based on number of lines
                let lineCount = 2; // App Name + Time
                if (textUser) lineCount++;
                if (textLocation) lineCount++;

                const totalHeight =
                    textHeight * 0.8 * (lineCount - 1) +
                    textHeight +
                    lineGap * (lineCount - 1);

                // Box dimensions
                const boxWidth = maxWidth + padding * 2;
                const boxHeight = totalHeight + padding * 2;
                const boxX = canvas.width - boxWidth;
                const boxY = canvas.height - boxHeight;

                // Draw background (semi-transparent black)
                context.fillStyle = "rgba(0, 0, 0, 0.6)";
                context.fillRect(boxX, boxY, boxWidth, boxHeight);

                // Draw texts
                context.textAlign = "right";
                context.fillStyle = "#ffffff";

                let currentY = canvas.height - padding;
                const smallerFont = Math.floor(fontSize * 0.8);

                // Draw from bottom to top
                context.font = `normal ${smallerFont}px sans-serif`;
                if (textLocation) {
                    context.fillText(
                        textLocation,
                        canvas.width - padding,
                        currentY,
                    );
                    currentY -= smallerFont + lineGap;
                }

                if (textUser) {
                    context.fillText(
                        textUser,
                        canvas.width - padding,
                        currentY,
                    );
                    currentY -= smallerFont + lineGap;
                }

                context.fillText(textTime, canvas.width - padding, currentY);
                currentY -= smallerFont + lineGap;

                context.font = `bold ${fontSize}px sans-serif`;
                context.fillText(
                    textAppName,
                    canvas.width - padding,
                    currentY + (fontSize - smallerFont),
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-100 bg-black flex flex-col">
            {/* Header Controls */}
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
                {/* Hidden Canvas for capture processing */}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Bottom Controls */}
            <div className="bg-black/80 p-6 pb-8 backdrop-blur-sm">
                <div className="flex items-center justify-center max-w-md mx-auto">
                    {/* Shutter Button */}
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
        </div>
    );
}
