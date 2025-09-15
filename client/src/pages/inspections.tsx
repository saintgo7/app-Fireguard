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
import { Textarea } from "@/components/ui/textarea";
import { 
  ClipboardList, Edit, Plus, MapPin, Calendar, User, Play, Square, 
  CheckCircle, AlertTriangle, Download, FileText, Activity 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Inspection, Building, User as UserType, InsertInspection } from "@shared/schema";

export default function Inspections() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const [formData, setFormData] = useState<InsertInspection>({
    buildingId: "",
    inspectorId: "",
    type: "routine",
    scheduledDate: new Date(),
    status: "scheduled",
    notes: ""
  });

  const { data: inspections, isLoading: inspectionsLoading } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertInspection) => {
      const res = await apiRequest("POST", "/api/inspections", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "점검이 성공적으로 예약되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "점검 예약에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertInspection> }) => {
      const res = await apiRequest("PUT", `/api/inspections/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "점검 정보가 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "점검 정보 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updateData: any = { status };
      if (status === "completed") {
        updateData.completedDate = new Date();
      }
      const res = await apiRequest("PUT", `/api/inspections/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      toast({
        title: "성공",
        description: "점검 상태가 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "점검 상태 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      buildingId: "",
      inspectorId: "",
      type: "routine",
      scheduledDate: new Date(),
      status: "scheduled",
      notes: ""
    });
    setEditingInspection(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInspection) {
      updateMutation.mutate({ id: editingInspection.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (inspection: Inspection) => {
    setEditingInspection(inspection);
    setFormData({
      buildingId: inspection.buildingId,
      inspectorId: inspection.inspectorId,
      type: inspection.type,
      scheduledDate: new Date(inspection.scheduledDate),
      status: inspection.status,
      notes: inspection.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleStatusUpdate = (inspectionId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: inspectionId, status: newStatus });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "routine": return "정기점검";
      case "emergency": return "긴급점검";
      case "annual": return "연간점검";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "routine": return "bg-blue-100 text-blue-800";
      case "emergency": return "bg-red-100 text-red-800";
      case "annual": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "scheduled": return "예정";
      case "in_progress": return "진행중";
      case "completed": return "완료";
      case "overdue": return "지연";
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-yellow-100 text-yellow-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      case "overdue": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const filteredInspections = inspections?.filter(inspection => {
    const matchesStatus = selectedStatus === "all" || inspection.status === selectedStatus;
    const matchesBuilding = selectedBuilding === "all" || inspection.buildingId === selectedBuilding;
    const matchesTab = activeTab === "all" || inspection.status === activeTab;
    return matchesStatus && matchesBuilding && matchesTab;
  }) || [];

  const getInspectionStats = () => {
    const total = inspections?.length || 0;
    const scheduled = inspections?.filter(i => i.status === "scheduled").length || 0;
    const inProgress = inspections?.filter(i => i.status === "in_progress").length || 0;
    const completed = inspections?.filter(i => i.status === "completed").length || 0;
    const overdue = inspections?.filter(i => i.status === "overdue").length || 0;
    
    return { total, scheduled, inProgress, completed, overdue };
  };

  const stats = getInspectionStats();

  const getActionButtons = (inspection: Inspection) => {
    const buttons = [];
    
    switch (inspection.status) {
      case "scheduled":
        buttons.push(
          <Button
            key="start"
            variant="ghost"
            size="icon"
            onClick={() => handleStatusUpdate(inspection.id, "in_progress")}
            title="점검 시작"
            data-testid={`button-start-inspection-${inspection.id}`}
          >
            <Play className="w-4 h-4 text-green-600" />
          </Button>
        );
        break;
      case "in_progress":
        buttons.push(
          <Button
            key="complete"
            variant="ghost"
            size="icon"
            onClick={() => handleStatusUpdate(inspection.id, "completed")}
            title="점검 완료"
            data-testid={`button-complete-inspection-${inspection.id}`}
          >
            <CheckCircle className="w-4 h-4 text-green-600" />
          </Button>
        );
        break;
      case "completed":
        if (inspection.reportUrl) {
          buttons.push(
            <Button
              key="download"
              variant="ghost"
              size="icon"
              title="보고서 다운로드"
              data-testid={`button-download-report-${inspection.id}`}
            >
              <Download className="w-4 h-4 text-blue-600" />
            </Button>
          );
        }
        break;
    }

    buttons.push(
      <Button
        key="edit"
        variant="ghost"
        size="icon"
        onClick={() => handleEdit(inspection)}
        title="수정"
        data-testid={`button-edit-inspection-${inspection.id}`}
      >
        <Edit className="w-4 h-4" />
      </Button>
    );

    return buttons;
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="점검 관리" subtitle="소방 점검 일정 및 이력 관리" />
        <main className="flex-1 overflow-auto p-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">전체 점검</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-inspections">{stats.total}</p>
                  </div>
                  <ClipboardList className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">예정</p>
                    <p className="text-2xl font-bold text-yellow-600" data-testid="stat-scheduled-inspections">{stats.scheduled}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">진행중</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="stat-progress-inspections">{stats.inProgress}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">완료</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="stat-completed-inspections">{stats.completed}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">지연</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="stat-overdue-inspections">{stats.overdue}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">점검 목록</h2>
              <p className="text-muted-foreground">예정된 점검과 완료된 점검을 관리하세요.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm} data-testid="button-add-inspection">
                  <Plus className="w-4 h-4" />
                  새 점검 예약
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" data-testid="dialog-inspection-form">
                <DialogHeader>
                  <DialogTitle>
                    {editingInspection ? "점검 정보 수정" : "새 점검 예약"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="buildingId">건물</Label>
                    <Select 
                      value={formData.buildingId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, buildingId: value }))}
                    >
                      <SelectTrigger data-testid="select-inspection-building">
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
                    <Label htmlFor="inspectorId">점검자</Label>
                    <Select 
                      value={formData.inspectorId} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, inspectorId: value }))}
                    >
                      <SelectTrigger data-testid="select-inspection-inspector">
                        <SelectValue placeholder="점검자 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">점검 유형</Label>
                    <Select 
                      value={formData.type} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger data-testid="select-inspection-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="routine">정기점검</SelectItem>
                        <SelectItem value="emergency">긴급점검</SelectItem>
                        <SelectItem value="annual">연간점검</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate">예정 날짜</Label>
                    <Input
                      id="scheduledDate"
                      data-testid="input-inspection-date"
                      type="datetime-local"
                      value={formData.scheduledDate.toISOString().slice(0, 16)}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: new Date(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">메모</Label>
                    <Textarea
                      id="notes"
                      data-testid="input-inspection-notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="점검 관련 특이사항이나 요청사항을 입력하세요..."
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      data-testid="button-save-inspection"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingInspection ? "수정" : "예약"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-inspection"
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs and Filters */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <TabsList className="grid w-full max-w-md grid-cols-4">
                <TabsTrigger value="all" data-testid="tab-all">전체</TabsTrigger>
                <TabsTrigger value="scheduled" data-testid="tab-scheduled">예정</TabsTrigger>
                <TabsTrigger value="in_progress" data-testid="tab-progress">진행중</TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">완료</TabsTrigger>
              </TabsList>
              <div className="flex gap-4">
                <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                  <SelectTrigger className="w-[200px]" data-testid="filter-inspection-building">
                    <SelectValue placeholder="건물 필터" />
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
            </div>
          </Tabs>

          {inspectionsLoading ? (
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
                  <ClipboardList className="w-5 h-5" />
                  점검 목록 ({filteredInspections.length}개)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredInspections.length === 0 ? (
                  <div className="p-8 text-center">
                    <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">예약된 점검이 없습니다</h3>
                    <p className="text-muted-foreground mb-4">새 점검을 예약하여 소방 안전 관리를 시작하세요.</p>
                    <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-inspection">
                      <Plus className="w-4 h-4 mr-2" />
                      첫 번째 점검 예약
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>건물</TableHead>
                        <TableHead>점검 유형</TableHead>
                        <TableHead>점검자</TableHead>
                        <TableHead>예정 날짜</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>완료 날짜</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInspections.map((inspection) => {
                        const building = buildings?.find(b => b.id === inspection.buildingId);
                        const inspector = users?.find(u => u.id === inspection.inspectorId);
                        return (
                          <TableRow key={inspection.id} data-testid={`inspection-row-${inspection.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                {building?.name || "알 수 없음"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTypeColor(inspection.type)}>
                                {getTypeLabel(inspection.type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-muted-foreground" />
                                {inspector?.name || "알 수 없음"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                {new Date(inspection.scheduledDate).toLocaleString('ko-KR')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(inspection.status)}>
                                {getStatusLabel(inspection.status)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {inspection.completedDate 
                                ? new Date(inspection.completedDate).toLocaleDateString('ko-KR')
                                : "-"
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {getActionButtons(inspection)}
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