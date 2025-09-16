import { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenTool, RotateCcw, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SignatureCaptureProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
  title?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function SignatureCapture({
  onSave,
  onCancel,
  title = "서명",
  width = 400,
  height = 200,
  className = ""
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }, [width, height]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    setIsEmpty(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    setIsEmpty(true);
  };

  const saveSignature = () => {
    if (isEmpty) {
      toast({
        title: "경고",
        description: "서명을 해주세요.",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert to data URL (base64)
    const dataURL = canvas.toDataURL('image/png');
    onSave(dataURL);
    
    toast({
      title: "성공",
      description: "서명이 저장되었습니다.",
    });
  };

  return (
    <Card className={`w-full max-w-lg mx-auto ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <PenTool className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          아래 영역에 서명해 주세요
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas Container */}
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <canvas
            ref={canvasRef}
            data-testid="canvas-signature"
            className="w-full h-full cursor-crosshair touch-none"
            style={{ aspectRatio: `${width}/${height}` }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm">서명 영역</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={clearSignature}
            disabled={isEmpty}
            data-testid="button-clear-signature"
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            지우기
          </Button>
          
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel-signature"
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              취소
            </Button>
            <Button
              type="button"
              onClick={saveSignature}
              disabled={isEmpty}
              data-testid="button-save-signature"
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              저장
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SignatureDisplayProps {
  signatureUrl: string;
  onEdit: () => void;
  onRemove: () => void;
  title?: string;
  className?: string;
}

export function SignatureDisplay({
  signatureUrl,
  onEdit,
  onRemove,
  title = "서명",
  className = ""
}: SignatureDisplayProps) {
  return (
    <Card className={`w-full max-w-lg mx-auto ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <PenTool className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Signature Display */}
        <div className="border-2 border-gray-300 rounded-lg bg-white p-4">
          <img
            src={signatureUrl}
            alt="서명"
            className="w-full h-auto max-h-32 object-contain"
            data-testid="img-signature-display"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onEdit}
            data-testid="button-edit-signature"
          >
            수정
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRemove}
            data-testid="button-remove-signature"
          >
            제거
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}