import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { 
  FileText, 
  Download, 
  Upload, 
  Search, 
  Filter,
  Award,
  Shield,
  Calendar,
  Building,
  User
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { UploadResult } from "@uppy/core";
import type { Inspection, Building as BuildingType, User as UserType, Document } from "@shared/schema";

export default function Documents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch data
  const { data: inspections } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  const { data: buildings } = useQuery<BuildingType[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Fetch documents from backend
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Generate inspection report
  const generateReportMutation = useMutation({
    mutationFn: async (inspectionId: string) => {
      const response = await fetch(`/api/reports/inspection/${inspectionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error('Failed to generate report');
      return response.blob();
    },
    onSuccess: (blob, inspectionId) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection-report-${inspectionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "성공",
        description: "점검 보고서가 성공적으로 생성되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "보고서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Generate compliance report
  const generateComplianceReportMutation = useMutation({
    mutationFn: async (data: { buildingId?: string; startDate?: string; endDate?: string }) => {
      const response = await fetch("/api/reports/compliance", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error('Failed to generate compliance report');
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "성공",
        description: "컴플라이언스 보고서가 성공적으로 생성되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "컴플라이언스 보고서 생성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // File upload handlers
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error('Failed to get upload URL');
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const fileURL = uploadedFile.uploadURL;
      
      try {
        // Create document record after successful upload
        const response = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: uploadedFile.name || "업로드된 문서",
            type: "safety_manual",
            fileUrl: fileURL,
            fileSize: uploadedFile.size || 0,
            status: "active",
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create document record');
        }

        toast({
          title: "성공",
          description: "문서가 성공적으로 업로드되었습니다.",
        });
        
        // Invalidate related queries to refresh the data
        await queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      } catch (error) {
        console.error("Error creating document record:", error);
        toast({
          title: "오류",
          description: error instanceof Error ? error.message : "문서 업로드 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "오류",
        description: "파일 업로드에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || doc.type === filterType;
    const matchesBuilding = selectedBuilding === "all" || doc.buildingId === selectedBuilding;
    return matchesSearch && matchesType && matchesBuilding;
  });

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case "inspection_report": return "점검보고서";
      case "compliance_certificate": return "컴플라이언스 인증서";
      case "maintenance_record": return "유지보수 기록";
      case "safety_manual": return "안전 매뉴얼";
      default: return "문서";
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case "inspection_report": return <FileText className="h-4 w-4" />;
      case "compliance_certificate": return <Award className="h-4 w-4" />;
      case "maintenance_record": return <Shield className="h-4 w-4" />;
      case "safety_manual": return <FileText className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getBuildingName = (buildingId?: string | null) => {
    if (!buildingId) return "-";
    const building = buildings?.find(b => b.id === buildingId);
    return building?.name || "알 수 없는 건물";
  };

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user?.name || "알 수 없는 사용자";
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="문서 관리" subtitle="점검 문서 및 인증서 관리" />
        <main className="flex-1 overflow-auto p-6">
          <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">문서 관리</h1>
              <div className="flex gap-2">
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={52428800} // 50MB
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="flex items-center gap-2"
                  data-testid="button-upload-document"
                >
                  <Upload className="h-4 w-4" />
                  문서 업로드
                </ObjectUploader>
              </div>
            </div>

            <Tabs defaultValue="documents" className="space-y-6">
              <TabsList>
                <TabsTrigger value="documents">문서 라이브러리</TabsTrigger>
                <TabsTrigger value="reports">보고서 생성</TabsTrigger>
                <TabsTrigger value="certificates">인증서 관리</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>문서 검색 및 필터</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="문서 제목으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                            data-testid="input-search"
                          />
                        </div>
                      </div>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-48" data-testid="select-document-type">
                          <SelectValue placeholder="문서 유형" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 유형</SelectItem>
                          <SelectItem value="inspection_report">점검보고서</SelectItem>
                          <SelectItem value="compliance_certificate">컴플라이언스 인증서</SelectItem>
                          <SelectItem value="maintenance_record">유지보수 기록</SelectItem>
                          <SelectItem value="safety_manual">안전 매뉴얼</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                        <SelectTrigger className="w-48" data-testid="select-building">
                          <SelectValue placeholder="건물 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">모든 건물</SelectItem>
                          {buildings?.map((building) => (
                            <SelectItem key={building.id} value={building.id}>
                              {building.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>문서 목록 ({filteredDocuments.length}개)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>문서</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead>건물</TableHead>
                          <TableHead>업로드자</TableHead>
                          <TableHead>업로드일</TableHead>
                          <TableHead>크기</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((doc) => (
                          <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getDocumentTypeIcon(doc.type)}
                                <span className="font-medium">{doc.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getDocumentTypeLabel(doc.type)}
                              </Badge>
                            </TableCell>
                            <TableCell>{getBuildingName(doc.buildingId)}</TableCell>
                            <TableCell>{getUserName(doc.uploadedBy)}</TableCell>
                            <TableCell>
                              {format(new Date(doc.createdAt), 'yyyy.MM.dd HH:mm', { locale: ko })}
                            </TableCell>
                            <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                            <TableCell>
                              <Badge variant={doc.status === "active" ? "default" : "secondary"}>
                                {doc.status === "active" ? "활성" : doc.status === "archived" ? "보관" : "만료"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.fileUrl, '_blank')}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filteredDocuments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                              검색 조건에 맞는 문서가 없습니다.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        점검 보고서 생성
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">
                        완료된 점검에 대한 PDF 보고서를 생성합니다.
                      </p>
                      <div className="space-y-2">
                        {inspections?.filter(i => i.status === "completed").slice(0, 5).map((inspection) => (
                          <div key={inspection.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <p className="font-medium">{getBuildingName(inspection.buildingId)}</p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(inspection.scheduledDate), 'yyyy.MM.dd', { locale: ko })}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => generateReportMutation.mutate(inspection.id)}
                              disabled={generateReportMutation.isPending}
                              data-testid={`button-generate-${inspection.id}`}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              생성
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        컴플라이언스 보고서 생성
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600">
                        규정 준수 현황에 대한 종합 보고서를 생성합니다.
                      </p>
                      <div className="space-y-3">
                        <Select>
                          <SelectTrigger data-testid="select-compliance-building">
                            <SelectValue placeholder="건물 선택 (선택사항)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">모든 건물</SelectItem>
                            {buildings?.map((building) => (
                              <SelectItem key={building.id} value={building.id}>
                                {building.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          className="w-full"
                          onClick={() => generateComplianceReportMutation.mutate({})}
                          disabled={generateComplianceReportMutation.isPending}
                          data-testid="button-generate-compliance"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          컴플라이언스 보고서 생성
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="certificates" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      인증서 관리
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* Certificate cards would go here */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-4 w-4 text-green-600" />
                          <span className="font-medium">소방안전관리 인증</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">유효기간: 2024.12.31</p>
                        <Badge variant="default">활성</Badge>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">건축물 안전점검 인증</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">유효기간: 2025.06.30</p>
                        <Badge variant="default">활성</Badge>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">정기점검 완료증</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">발급일: 2024.09.15</p>
                        <Badge variant="secondary">갱신 필요</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}