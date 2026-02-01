import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QrCode, Camera, AlertCircle, Box, CheckCircle2 } from 'lucide-react';
import { QRScanner } from '@/components/qr/QRScanner';
import { useAssets } from '@/hooks/useAssets';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function QRScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const { data: allAssets } = useAssets();
  const navigate = useNavigate();

  const handleScanResult = (result: string) => {
    setLastScanned(result);
    setIsScanning(false);

    // Try to find the asset by QR code or ID
    const asset = allAssets?.find(a => a.qr_code === result || a.id === result);
    
    if (asset) {
      toast.success(`Found: ${asset.name}`);
      // Navigate to assets page with the asset selected
      navigate(`/assets?selected=${asset.id}`);
    } else {
      toast.error('Asset not found in system');
    }
  };

  const handleScanError = (error: string) => {
    toast.error(error);
    setIsScanning(false);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <QrCode className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">QR Scanner</h1>
          </div>
          <p className="text-muted-foreground">Scan QR codes to quickly identify assets</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scan Asset QR Code
            </CardTitle>
            <CardDescription>
              Point your camera at an asset QR code to view its details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isScanning ? (
              <div className="space-y-4">
                <QRScanner 
                  onScanSuccess={handleScanResult}
                  onScanError={handleScanError}
                />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsScanning(false)}
                >
                  Cancel Scan
                </Button>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="h-24 w-24 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Ready to Scan</p>
                  <p className="text-sm text-muted-foreground">
                    Click the button below to start scanning
                  </p>
                </div>
                <Button onClick={() => setIsScanning(true)} size="lg">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Scan Result */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="h-5 w-5" />
              Last Scanned
            </CardTitle>
            <CardDescription>
              Your most recent scan result
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastScanned ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <Badge variant="secondary">Scanned</Badge>
                  </div>
                  <p className="font-mono text-sm break-all">{lastScanned}</p>
                </div>
                
                {allAssets?.find(a => a.qr_code === lastScanned || a.id === lastScanned) && (
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-2">Matched Asset:</p>
                    <p className="font-medium">
                      {allAssets.find(a => a.qr_code === lastScanned || a.id === lastScanned)?.name}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">No Recent Scans</p>
                <p className="text-sm text-muted-foreground">
                  Start scanning to see results here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-primary">1</span>
              </div>
              <div>
                <p className="font-medium">Start Scanner</p>
                <p className="text-sm text-muted-foreground">
                  Click "Start Scanning" to activate your camera
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-primary">2</span>
              </div>
              <div>
                <p className="font-medium">Point at QR Code</p>
                <p className="text-sm text-muted-foreground">
                  Position the QR code within the camera view
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-primary">3</span>
              </div>
              <div>
                <p className="font-medium">View Asset Details</p>
                <p className="text-sm text-muted-foreground">
                  You'll be taken to the asset's details page
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
