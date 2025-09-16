import { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, X, RefreshCw } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function BarcodeScanner({
  onScanSuccess,
  onScanError,
  isOpen,
  onOpenChange,
  title = "바코드 스캔",
  description = "카메라를 바코드에 맞춰주세요"
}: BarcodeScannerProps) {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeScannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = `qr-reader-${Math.random().toString(36).substr(2, 9)}`; // Unique ID to prevent collisions

  const initializeScanner = async () => {
    if (!scannerRef.current || scannerInitialized) return;

    try {
      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeScannerRef.current = html5QrCode;

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras();
      
      if (cameras && cameras.length > 0) {
        const cameraId = cameras[0].id;
        
        // Import Html5QrcodeSupportedFormats to support 1D barcodes
        const { Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        
        const config = {
          fps: 8,
          qrbox: { width: 300, height: 200 },
          aspectRatio: 1.5,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E
          ],
        };

        await html5QrCode.start(
          cameraId,
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Handle scan error silently for continuous scanning
            if (onScanError) {
              onScanError(errorMessage);
            }
          }
        );

        setIsScanning(true);
        setScannerInitialized(true);
      } else {
        throw new Error('카메라를 찾을 수 없습니다');
      }
    } catch (error) {
      console.error('Scanner initialization error:', error);
      toast({
        title: "스캐너 오류",
        description: "카메라 접근에 실패했습니다. 카메라 권한을 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    // Stop scanner
    stopScanner();
    
    // Call success callback
    onScanSuccess(decodedText);
    
    // Show success message
    toast({
      title: "스캔 성공",
      description: `바코드를 성공적으로 읽었습니다: ${decodedText}`,
    });
    
    // Close dialog
    onOpenChange(false);
  };

  const stopScanner = async () => {
    if (html5QrCodeScannerRef.current && isScanning) {
      try {
        await html5QrCodeScannerRef.current.stop();
        html5QrCodeScannerRef.current.clear();
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
    setScannerInitialized(false);
    html5QrCodeScannerRef.current = null;
  };

  const restartScanner = async () => {
    await stopScanner();
    setTimeout(() => {
      initializeScanner();
    }, 100);
  };

  // Initialize scanner when dialog opens
  useEffect(() => {
    if (isOpen && !scannerInitialized) {
      setTimeout(() => {
        initializeScanner();
      }, 200); // Small delay to ensure DOM is ready
    }
  }, [isOpen, scannerInitialized]);

  // Cleanup when dialog closes
  useEffect(() => {
    if (!isOpen && scannerInitialized) {
      stopScanner();
    }
  }, [isOpen, scannerInitialized]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scanner Container */}
            <div className="relative">
              <div 
                id={scannerId} 
                ref={scannerRef}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg overflow-hidden"
                style={{ minHeight: '300px' }}
              />
              
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-600">카메라 초기화 중...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={restartScanner}
                disabled={!scannerInitialized}
                data-testid="button-restart-scanner"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                다시 시작
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-scanner"
              >
                <X className="h-4 w-4 mr-1" />
                닫기
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 바코드나 QR 코드를 카메라 중앙의 박스 안에 맞춰주세요</p>
              <p>• 충분한 조명 환경에서 스캔해주세요</p>
              <p>• 카메라와 바코드 사이의 거리를 조절해주세요</p>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

// Compact inline barcode scanner button component
export interface BarcodeScannerButtonProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  buttonText?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export function BarcodeScannerButton({
  onScanSuccess,
  onScanError,
  buttonText = "바코드 스캔",
  variant = "outline",
  size = "sm",
  disabled = false
}: BarcodeScannerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        data-testid="button-open-barcode-scanner"
      >
        <Camera className="h-4 w-4 mr-1" />
        {buttonText}
      </Button>
      
      <BarcodeScanner
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onScanSuccess={onScanSuccess}
        onScanError={onScanError}
        title="장비 바코드 스캔"
        description="장비의 바코드나 QR 코드를 스캔하여 시리얼 번호를 자동으로 입력합니다"
      />
    </>
  );
}