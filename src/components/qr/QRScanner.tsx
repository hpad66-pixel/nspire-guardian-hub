import { useEffect, useRef, useState } from 'react';
import { Camera, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (result: string) => void;
  onScanError?: (error: string) => void;
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<number>();

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setIsLoading(false);
          startScanning();
        }
      } catch (error) {
        console.error('Camera error:', error);
        setHasCamera(false);
        setIsLoading(false);
        onScanError?.('Could not access camera. Please ensure camera permissions are granted.');
      }
    };

    const startScanning = () => {
      const scan = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) {
          animationRef.current = requestAnimationFrame(scan);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for QR detection
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Use BarcodeDetector API if available (Chrome, Edge)
        if ('BarcodeDetector' in window) {
          // @ts-expect-error - BarcodeDetector is not in TypeScript's lib
          const barcodeDetector = new BarcodeDetector({ formats: ['qr_code'] });
          barcodeDetector.detect(video)
            .then((barcodes: any[]) => {
              if (barcodes.length > 0) {
                onScanSuccess(barcodes[0].rawValue);
                return;
              }
              animationRef.current = requestAnimationFrame(scan);
            })
            .catch(() => {
              animationRef.current = requestAnimationFrame(scan);
            });
        } else {
          // Fallback: For browsers without BarcodeDetector, we'll use a simple pattern
          // In production, you'd want to add a library like jsQR
          animationRef.current = requestAnimationFrame(scan);
        }
      };

      animationRef.current = requestAnimationFrame(scan);
    };

    startCamera();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScanSuccess, onScanError]);

  if (!hasCamera) {
    return (
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center p-6">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">Camera Not Available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please grant camera permissions to use the scanner
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square bg-black rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="text-center">
            <Camera className="h-8 w-8 mx-auto text-muted-foreground animate-pulse" />
            <p className="text-sm text-muted-foreground mt-2">Starting camera...</p>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        playsInline
        muted
      />
      
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Scanning overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Corner markers */}
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2">
          {/* Top-left */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary" />
          {/* Top-right */}
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary" />
          {/* Bottom-left */}
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary" />
          {/* Bottom-right */}
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary" />
        </div>
        
        {/* Scanning line animation */}
        <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2">
          <div className="absolute w-full h-0.5 bg-primary/50 animate-pulse" 
               style={{ 
                 animation: 'scan 2s ease-in-out infinite',
                 top: '50%'
               }} 
          />
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0%, 100% { top: 25%; opacity: 0.5; }
          50% { top: 75%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
