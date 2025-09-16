import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarcodeScannerButton } from "@/components/BarcodeScanner";
import { CheckCircle, XCircle, AlertCircle, Package, MapPin, Calendar, Hash } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { Equipment } from "@shared/schema";

export interface EquipmentBarcodeVerifierProps {
  equipment: Equipment[];
  buildings?: Array<{ id: string; name: string; }>;
}

export function EquipmentBarcodeVerifier({ equipment, buildings }: EquipmentBarcodeVerifierProps) {
  const { toast } = useToast();
  const [verificationResult, setVerificationResult] = useState<{
    equipment: Equipment | null;
    status: 'found' | 'not_found' | 'none';
    scannedCode: string;
  }>({
    equipment: null,
    status: 'none',
    scannedCode: ''
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "extinguisher": return "소화기";
      case "sprinkler": return "스프링클러";
      case "smoke_detector": return "연기감지기";
      case "alarm": return "화재경보기";
      case "emergency_exit": return "비상구";
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "정상";
      case "maintenance": return "점검중";
      case "decommissioned": return "폐기";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "maintenance": return "bg-yellow-100 text-yellow-800";
      case "decommissioned": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleVerifyEquipment = (scannedCode: string) => {
    const foundEquipment = equipment.find(item => 
      item.serialNumber?.toLowerCase() === scannedCode.toLowerCase()
    );
    
    if (foundEquipment) {
      setVerificationResult({
        equipment: foundEquipment,
        status: 'found',
        scannedCode
      });
      
      toast({
        title: "장비 확인 성공",
        description: `${getTypeLabel(foundEquipment.type)}가 확인되었습니다.`,
      });
    } else {
      setVerificationResult({
        equipment: null,
        status: 'not_found',
        scannedCode
      });
      
      toast({
        title: "장비를 찾을 수 없음",
        description: `시리얼 번호 "${scannedCode}"에 해당하는 장비가 등록되지 않았습니다.`,
        variant: "destructive",
      });
    }
  };

  const resetVerification = () => {
    setVerificationResult({
      equipment: null,
      status: 'none',
      scannedCode: ''
    });
  };

  const getBuildingName = (buildingId: string) => {
    return buildings?.find(b => b.id === buildingId)?.name || buildingId;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          장비 바코드 검증
        </CardTitle>
        <CardDescription>
          바코드를 스캔하여 등록된 장비인지 확인하고 상세 정보를 조회합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner Button */}
        <div className="flex justify-center">
          <BarcodeScannerButton
            onScanSuccess={handleVerifyEquipment}
            buttonText="장비 바코드 스캔"
            variant="default"
            size="lg"
          />
        </div>

        {/* Verification Results */}
        {verificationResult.status !== 'none' && (
          <div className="space-y-4">
            {verificationResult.status === 'found' && verificationResult.equipment && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-green-900 mb-1">
                          장비 확인 완료
                        </h3>
                        <p className="text-sm text-green-700">
                          스캔된 코드: <code className="bg-green-100 px-1 rounded">{verificationResult.scannedCode}</code>
                        </p>
                      </div>
                      
                      {/* Equipment Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">유형:</span>
                          <span>{getTypeLabel(verificationResult.equipment.type)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">위치:</span>
                          <span>{verificationResult.equipment.location}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">시리얼:</span>
                          <span>{verificationResult.equipment.serialNumber}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="font-medium">상태:</span>
                          <Badge className={getStatusColor(verificationResult.equipment.status)}>
                            {getStatusLabel(verificationResult.equipment.status)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 md:col-span-2">
                          <span className="font-medium">건물:</span>
                          <span>{getBuildingName(verificationResult.equipment.buildingId)}</span>
                        </div>
                        
                        {verificationResult.equipment.installationDate && (
                          <div className="flex items-center gap-2 md:col-span-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">설치일:</span>
                            <span>
                              {new Date(verificationResult.equipment.installationDate).toLocaleDateString('ko-KR')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {verificationResult.status === 'not_found' && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-900 mb-1">
                        장비를 찾을 수 없음
                      </h3>
                      <p className="text-sm text-red-700 mb-3">
                        스캔된 코드: <code className="bg-red-100 px-1 rounded">{verificationResult.scannedCode}</code>
                      </p>
                      <div className="flex items-start gap-2 text-sm text-red-600">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <div>
                          <p>이 시리얼 번호에 해당하는 장비가 시스템에 등록되지 않았습니다.</p>
                          <p className="mt-1">• 시리얼 번호를 확인해주세요</p>
                          <p>• 장비가 등록되었는지 확인해주세요</p>
                          <p>• 필요시 새 장비로 등록해주세요</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={resetVerification}
                data-testid="button-reset-verification"
              >
                다시 스캔
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {verificationResult.status === 'none' && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="text-center space-y-2">
                <Package className="h-8 w-8 mx-auto text-blue-600" />
                <h3 className="font-semibold text-blue-900">장비 바코드 검증 방법</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>1. 위의 "장비 바코드 스캔" 버튼을 클릭하세요</p>
                  <p>2. 카메라가 활성화되면 장비의 바코드에 카메라를 향하세요</p>
                  <p>3. 바코드가 인식되면 자동으로 장비 정보가 표시됩니다</p>
                  <p>4. 등록되지 않은 장비는 "장비를 찾을 수 없음" 메시지가 표시됩니다</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}