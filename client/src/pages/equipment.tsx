import { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Edit, Trash, Plus, MapPin, Calendar, Hash, Activity, Camera, Search, X } from "lucide-react";
import { FireExtinguisher, Droplets, Cigarette, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BarcodeScannerButton } from "@/components/BarcodeScanner";
import { EquipmentBarcodeVerifier } from "@/components/EquipmentBarcodeVerifier";
import type { Equipment, Building, InsertEquipment } from "@shared/schema";

export default function Equipment() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [formData, setFormData] = useState<InsertEquipment>({
    buildingId: "",
    type: "extinguisher",
    location: "",
    serialNumber: "",
    installationDate: undefined,
    status: "active"
  });

  const { data: equipment, isLoading: equipmentLoading } = useQuery<Equipment[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEquipment) => {
      const res = await apiRequest("POST", "/api/equipment", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "장비가 성공적으로 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "장비 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEquipment> }) => {
      const res = await apiRequest("PUT", `/api/equipment/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "장비 정보가 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "장비 정보 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      buildingId: "",
      type: "extinguisher",
      location: "",
      serialNumber: "",
      installationDate: undefined,
      status: "active"
    });
    setEditingEquipment(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEquipment) {
      updateMutation.mutate({ id: editingEquipment.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (equipment: Equipment) => {
    setEditingEquipment(equipment);
    setFormData({
      buildingId: equipment.buildingId,
      type: equipment.type,
      location: equipment.location,
      serialNumber: equipment.serialNumber || "",
      installationDate: equipment.installationDate || undefined,
      status: equipment.status
    });
    setIsDialogOpen(true);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "extinguisher": return FireExtinguisher;
      case "sprinkler": return Droplets;
      case "smoke_detector": return Cigarette;
      case "alarm": return Bell;
      default: return Package;
    }
  };

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

  const filteredEquipment = equipment?.filter(item => {
    const matchesBuilding = selectedBuilding === "all" || item.buildingId === selectedBuilding;
    const matchesType = selectedType === "all" || item.type === selectedType;
    const matchesSearch = searchTerm === "" || 
      (item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBuilding && matchesType && matchesSearch;
  }) || [];

  // Equipment search by barcode scanning
  const handleEquipmentSearch = (scannedCode: string) => {
    const foundEquipment = equipment?.find(item => 
      item.serialNumber?.toLowerCase() === scannedCode.toLowerCase()
    );
    
    if (foundEquipment) {
      setSearchTerm(scannedCode);
      toast({
        title: "장비 발견",
        description: `${getTypeLabel(foundEquipment.type)} - ${foundEquipment.location}에서 발견되었습니다.`,
      });
    } else {
      toast({
        title: "장비를 찾을 수 없음",
        description: `시리얼 번호 "${scannedCode}"에 해당하는 장비가 없습니다.`,
        variant: "destructive",
      });
    }
  };

  const getEquipmentStats = () => {
    const total = equipment?.length || 0;
    const active = equipment?.filter(e => e.status === "active").length || 0;
    const maintenance = equipment?.filter(e => e.status === "maintenance").length || 0;
    const decommissioned = equipment?.filter(e => e.status === "decommissioned").length || 0;
    
    return { total, active, maintenance, decommissioned };
  };

  const stats = getEquipmentStats();

  const equipmentTypes = [
    { value: "extinguisher", label: "소화기", icon: FireExtinguisher },
    { value: "sprinkler", label: "스프링클러", icon: Droplets },
    { value: "smoke_detector", label: "연기감지기", icon: Cigarette },
    { value: "alarm", label: "화재경보기", icon: Bell },
    { value: "emergency_exit", label: "비상구", icon: Package }
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="장비 추적" subtitle="소방 장비 재고 및 상태 관리" />
        <main className="flex-1 overflow-auto p-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">전체 장비</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-equipment">{stats.total}</p>
                  </div>
                  <Package className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">정상 동작</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="stat-active-equipment">{stats.active}</p>
                  </div>
                  <Activity className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">점검중</p>
                    <p className="text-2xl font-bold text-yellow-600" data-testid="stat-maintenance-equipment">{stats.maintenance}</p>
                  </div>
                  <Edit className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">폐기</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="stat-decommissioned-equipment">{stats.decommissioned}</p>
                  </div>
                  <Trash className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">장비 목록</h2>
              <p className="text-muted-foreground">등록된 소방 장비들을 관리하고 새로운 장비를 추가하세요.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm} data-testid="button-add-equipment">
                  <Plus className="w-4 h-4" />
                  새 장비 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" data-testid="dialog-equipment-form">
                <DialogHeader>
                  <DialogTitle>
                    {editingEquipment ? "장비 정보 수정" : "새 장비 추가"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="buildingId">건물</Label>
                    <Select 
                      value={formData.buildingId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, buildingId: value }))}
                    >
                      <SelectTrigger data-testid="select-equipment-building">
                        <SelectValue placeholder="건물 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings?.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">장비 유형</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger data-testid="select-equipment-type">
                        <SelectValue placeholder="장비 유형 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">설치 위치</Label>
                    <Input
                      id="location"
                      data-testid="input-equipment-location"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="예: 1층 로비"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">시리얼 번호</Label>
                    <div className="flex gap-2">
                      <Input
                        id="serialNumber"
                        data-testid="input-equipment-serial"
                        value={formData.serialNumber || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                        placeholder="예: EXT-2024-001"
                        className="flex-1"
                      />
                      <BarcodeScannerButton
                        onScanSuccess={(scannedCode) => {
                          setFormData(prev => ({ ...prev, serialNumber: scannedCode }));
                        }}
                        buttonText="스캔"
                        size="default"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">상태</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger data-testid="select-equipment-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">정상</SelectItem>
                        <SelectItem value="maintenance">점검중</SelectItem>
                        <SelectItem value="decommissioned">폐기</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      data-testid="button-save-equipment"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingEquipment ? "수정" : "추가"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-equipment"
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4 mb-6">
            {/* Equipment Search */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label htmlFor="equipment-search" className="text-sm font-medium text-blue-900">
                      장비 검색 (시리얼 번호 또는 위치)
                    </Label>
                    <div className="flex gap-2 mt-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="equipment-search"
                          data-testid="input-equipment-search"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="시리얼 번호나 위치를 입력하세요..."
                          className="pl-10"
                        />
                      </div>
                      <BarcodeScannerButton
                        onScanSuccess={handleEquipmentSearch}
                        buttonText="바코드 검색"
                        variant="default"
                        size="default"
                      />
                      {searchTerm && (
                        <Button
                          variant="outline"
                          size="default"
                          onClick={() => setSearchTerm("")}
                          data-testid="button-clear-search"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {searchTerm && (
                  <div className="mt-3 text-sm text-blue-700">
                    검색 결과: <strong>{filteredEquipment.length}개 장비</strong>
                    {searchTerm && ` "${searchTerm}"에 대한`}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex gap-4">
              <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                <SelectTrigger className="w-[200px]" data-testid="filter-building">
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
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[200px]" data-testid="filter-type">
                  <SelectValue placeholder="장비 유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">모든 유형</SelectItem>
                  {equipmentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {equipmentLoading ? (
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
                  <Package className="w-5 h-5" />
                  등록된 장비 ({filteredEquipment.length}개)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredEquipment.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">등록된 장비가 없습니다</h3>
                    <p className="text-muted-foreground mb-4">새 장비를 추가하여 소방 장비 관리를 시작하세요.</p>
                    <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-equipment">
                      <Plus className="w-4 h-4 mr-2" />
                      첫 번째 장비 추가
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>장비</TableHead>
                        <TableHead>건물</TableHead>
                        <TableHead>위치</TableHead>
                        <TableHead>시리얼 번호</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>최근 점검</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEquipment.map((equipment) => {
                        const Icon = getTypeIcon(equipment.type);
                        const building = buildings?.find(b => b.id === equipment.buildingId);
                        return (
                          <TableRow key={equipment.id} data-testid={`equipment-row-${equipment.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{getTypeLabel(equipment.type)}</div>
                                  <div className="text-sm text-muted-foreground">{equipment.location}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                {building?.name || "알 수 없음"}
                              </div>
                            </TableCell>
                            <TableCell>{equipment.location}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Hash className="w-3 h-3 text-muted-foreground" />
                                {equipment.serialNumber || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(equipment.status)}>
                                {getStatusLabel(equipment.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {equipment.lastInspectionDate 
                                  ? new Date(equipment.lastInspectionDate).toLocaleDateString('ko-KR')
                                  : "점검 필요"
                                }
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(equipment)}
                                  data-testid={`button-edit-equipment-${equipment.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
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