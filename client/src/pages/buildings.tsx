import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building, Edit, Trash, Plus, MapPin, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Building as BuildingType, InsertBuilding } from "@shared/schema";

export default function Buildings() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<BuildingType | null>(null);
  const [formData, setFormData] = useState<InsertBuilding>({
    name: "",
    address: "",
    type: "commercial",
    floors: 1,
    contactPerson: "",
    contactPhone: ""
  });

  // Excel import states
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: buildings, isLoading } = useQuery<BuildingType[]>({
    queryKey: ["/api/buildings"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBuilding) => {
      const res = await apiRequest("POST", "/api/buildings", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "건물이 성공적으로 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "건물 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertBuilding> }) => {
      const res = await apiRequest("PUT", `/api/buildings/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "건물 정보가 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "건물 정보 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/buildings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      toast({
        title: "성공",
        description: "건물이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "건물 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Excel import mutation
  const importMutation = useMutation({
    mutationFn: async ({ file, mode }: { file: File; mode: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mode', mode);
      
      const response = await fetch('/api/buildings/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '업로드에 실패했습니다');
      }
      
      return await response.json();
    },
    onSuccess: (results) => {
      setImportResults(results);
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] });
      toast({
        title: "업로드 완료",
        description: `${results.totals.inserted}개 추가, ${results.totals.updated}개 수정됨`,
      });
    },
    onError: (error) => {
      toast({
        title: "업로드 실패",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      type: "commercial",
      floors: 1,
      contactPerson: "",
      contactPhone: ""
    });
    setEditingBuilding(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBuilding) {
      updateMutation.mutate({ id: editingBuilding.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (building: BuildingType) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      address: building.address,
      type: building.type,
      floors: building.floors,
      contactPerson: building.contactPerson || "",
      contactPhone: building.contactPhone || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 이 건물을 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  // Excel import handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResults(null);
      } else {
        toast({
          title: "지원하지 않는 파일 형식",
          description: "Excel 파일(.xlsx, .xls) 또는 CSV 파일만 업로드할 수 있습니다.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleImport = (mode: string) => {
    if (!selectedFile) return;
    
    setIsImporting(true);
    importMutation.mutate({ file: selectedFile, mode }, {
      onSettled: () => {
        setIsImporting(false);
      }
    });
  };

  const resetImportDialog = () => {
    setSelectedFile(null);
    setImportResults(null);
    setIsImporting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    // Create sample Excel template data
    const templateData = [
      ['건물명', '주소', '유형', '층수', '담당자', '연락처'],
      ['강남타워', '서울특별시 강남구 테헤란로 123', '상업', 15, '김담당', '02-1234-5678'],
      ['부산센터', '부산광역시 해운대구 해운대로 456', '상업', 20, '이관리', '051-9876-5432'],
      ['대구빌딩', '대구광역시 중구 중앙대로 789', '산업', 8, '박매니저', '053-5555-1234']
    ];

    // Convert to CSV format
    const csvContent = templateData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '건물정보_템플릿.csv';
    link.click();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "commercial": return "상업용";
      case "residential": return "주거용";
      case "industrial": return "산업용";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "commercial": return "bg-blue-100 text-blue-800";
      case "residential": return "bg-green-100 text-green-800";
      case "industrial": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="건물 관리" subtitle="관리 대상 건물 정보 및 설정" />
        <main className="flex-1 overflow-auto p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">건물 목록</h2>
              <p className="text-muted-foreground">등록된 건물들을 관리하고 새로운 건물을 추가하세요.</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2" onClick={resetImportDialog} data-testid="button-import-excel">
                    <FileSpreadsheet className="w-4 h-4" />
                    엑셀로 일괄 등록
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]" data-testid="dialog-excel-import">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5" />
                      엑셀 파일로 건물 일괄 등록
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Template Download */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-blue-900">템플릿 다운로드</h3>
                          <p className="text-sm text-blue-700">올바른 형식의 예시 파일을 다운로드하세요.</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={downloadTemplate}
                          data-testid="button-download-template"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          템플릿 다운로드
                        </Button>
                      </div>
                    </div>

                    {/* File Upload Area */}
                    <div 
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      }`}
                      onDrop={handleFileDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      data-testid="file-drop-zone"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                        data-testid="file-input"
                      />
                      
                      {selectedFile ? (
                        <div className="space-y-2">
                          <FileSpreadsheet className="w-12 h-12 mx-auto text-green-600" />
                          <div>
                            <p className="font-medium text-green-900">{selectedFile.name}</p>
                            <p className="text-sm text-green-700">
                              파일 크기: {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setSelectedFile(null)}
                            data-testid="button-remove-file"
                          >
                            <X className="w-4 h-4 mr-2" />
                            파일 제거
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-12 h-12 mx-auto text-gray-400" />
                          <div>
                            <p className="text-lg font-medium text-gray-700">
                              파일을 드래그하여 업로드하거나
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => fileInputRef.current?.click()}
                              data-testid="button-select-file"
                            >
                              파일 선택
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500">
                            지원 형식: Excel (.xlsx, .xls), CSV (.csv)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Import Options */}
                    {selectedFile && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleImport('upsert')}
                            disabled={isImporting}
                            className="flex-1"
                            data-testid="button-import-upsert"
                          >
                            {isImporting ? '처리 중...' : '가져오기 (중복 시 업데이트)'}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => handleImport('skip')}
                            disabled={isImporting}
                            className="flex-1"
                            data-testid="button-import-skip"
                          >
                            {isImporting ? '처리 중...' : '가져오기 (중복 시 건너뛰기)'}
                          </Button>
                        </div>
                        
                        {isImporting && (
                          <div className="space-y-2">
                            <Progress value={undefined} className="w-full" />
                            <p className="text-sm text-center text-muted-foreground">
                              파일을 처리하는 중입니다...
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Results */}
                    {importResults && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="font-medium">성공</p>
                                  <p className="text-sm text-muted-foreground">
                                    {importResults.totals.inserted + importResults.totals.updated}건
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <div>
                                  <p className="font-medium">실패</p>
                                  <p className="text-sm text-muted-foreground">
                                    {importResults.totals.failed}건
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-medium">상세 결과</h3>
                          <div className="text-sm space-y-1">
                            <p>• 총 행 수: {importResults.totals.rows}개</p>
                            <p>• 유효한 데이터: {importResults.totals.valid}개</p>
                            <p>• 새로 추가: {importResults.totals.inserted}개</p>
                            <p>• 업데이트: {importResults.totals.updated}개</p>
                            <p>• 건너뛴 항목: {importResults.totals.skipped}개</p>
                            <p>• 실패한 항목: {importResults.totals.failed}개</p>
                          </div>
                        </div>

                        {importResults.regions?.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="font-medium">지역별 분석</h3>
                            <ScrollArea className="h-32">
                              <div className="space-y-1 text-sm">
                                {importResults.regions.map((region: any, index: number) => (
                                  <div key={index} className="flex justify-between">
                                    <span>{region.sido} {region.sigungu}</span>
                                    <span>{region.count}건</span>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {importResults.errors?.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="font-medium text-red-600">오류 목록</h3>
                            <ScrollArea className="h-32">
                              <div className="space-y-1 text-sm">
                                {importResults.errors.map((error: any, index: number) => (
                                  <div key={index} className="text-red-600">
                                    행 {error.row}: {error.reason}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={resetForm} data-testid="button-add-building">
                    <Plus className="w-4 h-4" />
                    새 건물 추가
                  </Button>
                </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]" data-testid="dialog-building-form">
                <DialogHeader>
                  <DialogTitle>
                    {editingBuilding ? "건물 정보 수정" : "새 건물 추가"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">건물명</Label>
                    <Input
                      id="name"
                      data-testid="input-building-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="예: 강남타워"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">주소</Label>
                    <Input
                      id="address"
                      data-testid="input-building-address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="예: 서울시 강남구 테헤란로 123"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">건물 유형</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger data-testid="select-building-type">
                        <SelectValue placeholder="건물 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commercial">상업용</SelectItem>
                        <SelectItem value="residential">주거용</SelectItem>
                        <SelectItem value="industrial">산업용</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floors">층수</Label>
                    <Input
                      id="floors"
                      data-testid="input-building-floors"
                      type="number"
                      min="1"
                      value={formData.floors}
                      onChange={(e) => setFormData(prev => ({ ...prev, floors: parseInt(e.target.value) || 1 }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">담당자명</Label>
                    <Input
                      id="contactPerson"
                      data-testid="input-building-contact-person"
                      value={formData.contactPerson || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                      placeholder="예: 김담당"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">연락처</Label>
                    <Input
                      id="contactPhone"
                      data-testid="input-building-contact-phone"
                      value={formData.contactPhone || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      placeholder="예: 02-1234-5678"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      data-testid="button-save-building"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingBuilding ? "수정" : "추가"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-building"
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="p-8">
                <div className="flex items-center justify-center">
                  <div className="text-muted-foreground">로딩 중...</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  등록된 건물 ({buildings?.length || 0}개)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {buildings?.length === 0 ? (
                  <div className="p-8 text-center">
                    <Building className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">등록된 건물이 없습니다</h3>
                    <p className="text-muted-foreground mb-4">새 건물을 추가하여 소방 점검 관리를 시작하세요.</p>
                    <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-building">
                      <Plus className="w-4 h-4 mr-2" />
                      첫 번째 건물 추가
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>건물명</TableHead>
                        <TableHead>주소</TableHead>
                        <TableHead>유형</TableHead>
                        <TableHead>층수</TableHead>
                        <TableHead>담당자</TableHead>
                        <TableHead>연락처</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {buildings?.map((building) => (
                        <TableRow key={building.id} data-testid={`building-row-${building.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-muted-foreground" />
                              {building.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {building.address}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getTypeColor(building.type)}>
                              {getTypeLabel(building.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>{building.floors}층</TableCell>
                          <TableCell>{building.contactPerson || "-"}</TableCell>
                          <TableCell>{building.contactPhone || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(building)}
                                data-testid={`button-edit-building-${building.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(building.id)}
                                data-testid={`button-delete-building-${building.id}`}
                              >
                                <Trash className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}