"use client";

import React, { useRef, useState, useEffect } from "react";
import { X, Image as ImageIcon, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Handle Gallery Selection
    const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onCapture(file);
            onClose();
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
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="secondary"
                        >
                            Upload dari Galeri Saja
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
                <div className="flex items-center justify-around max-w-md mx-auto">
                    {/* Gallery Button */}
                    <div className="flex flex-col items-center gap-1">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="h-12 w-12 rounded-xl bg-gray-800 border border-gray-700 text-white hover:bg-gray-700"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <ImageIcon className="h-6 w-6" />
                        </Button>
                        <span className="text-[10px] text-gray-400 font-medium">
                            Galeri
                        </span>
                    </div>

                    {/* Shutter Button */}
                    <div className="relative group">
                        <button
                            onClick={handleCapture}
                            className="h-20 w-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-95 group-hover:bg-white/10"
                        >
                            <div className="h-16 w-16 bg-white rounded-full" />
                        </button>
                    </div>

                    {/* Spacer to balance layout (or add another feature like Flash later) */}
                    <div className="w-12 h-12" />
                </div>
            </div>

            {/* Hidden Input for Gallery */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleGallerySelect}
            />
        </div>
    );
}
