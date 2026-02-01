import { useMemo } from 'react';
import { QrCode } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
}

// Simple QR Code display using a QR code API
// For production, consider using a library like 'qrcode.react'
export function QRCodeGenerator({ value, size = 128, className }: QRCodeGeneratorProps) {
  const qrUrl = useMemo(() => {
    // Using QR Server API for simplicity
    const encodedValue = encodeURIComponent(value);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedValue}`;
  }, [value, size]);

  if (!value) {
    return (
      <div 
        className={`bg-muted flex items-center justify-center rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <QrCode className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={qrUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
    />
  );
}
