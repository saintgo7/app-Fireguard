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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, Edit, Trash, Plus, Calendar, CheckCircle, 
  XCircle, Activity, AlertTriangle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ComplianceRule, InsertComplianceRule } from "@shared/schema";

export default function Compliance() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ComplianceRule | null>(null);
  const [selectedEquipmentType, setSelectedEquipmentType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  
  const [formData, setFormData] = useState<InsertComplianceRule>({
    code: "",
    description: "",
    frequency: 30,
    equipmentType: "extinguisher",
    isActive: true
  });

  const { data: complianceRules, isLoading: rulesLoading } = useQuery<ComplianceRule[]>({
    queryKey: ["/api/compliance-rules"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertComplianceRule) => {
      const res = await apiRequest("POST", "/api/compliance-rules", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-rules"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "규정이 성공적으로 추가되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "규정 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertComplianceRule> }) => {
      const res = await apiRequest("PUT", `/api/compliance-rules/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-rules"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "성공",
        description: "규정 정보가 성공적으로 업데이트되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "규정 정보 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/compliance-rules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-rules"] });
      toast({
        title: "성공",
        description: "규정이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "규정 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      frequency: 30,
      equipmentType: "extinguisher",
      isActive: true
    });
    setEditingRule(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (rule: ComplianceRule) => {
    setEditingRule(rule);
    setFormData({
      code: rule.code,
      description: rule.description,
      frequency: rule.frequency,
      equipmentType: rule.equipmentType,
      isActive: rule.isActive
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 이 규정을 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const getEquipmentTypeLabel = (type: string) => {
    switch (type) {
      case "extinguisher": return "소화기";
      case "sprinkler": return "스프링클러";
      case "smoke_detector": return "연기감지기";
      case "alarm": return "화재경보기";
      case "emergency_exit": return "비상구";
      default: return type;
    }
  };

  const getEquipmentTypeColor = (type: string) => {
    switch (type) {
      case "extinguisher": return "bg-red-100 text-red-800";
      case "sprinkler": return "bg-blue-100 text-blue-800";
      case "smoke_detector": return "bg-gray-100 text-gray-800";
      case "alarm": return "bg-orange-100 text-orange-800";
      case "emergency_exit": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getFrequencyLabel = (days: number) => {
    if (days === 30) return "매월";
    if (days === 90) return "분기별";
    if (days === 180) return "반기별";
    if (days === 365) return "연간";
    return `${days}일마다`;
  };

  const filteredRules = complianceRules?.filter(rule => {
    const matchesEquipmentType = selectedEquipmentType === "all" || rule.equipmentType === selectedEquipmentType;
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && rule.isActive) ||
      (selectedStatus === "inactive" && !rule.isActive);
    return matchesEquipmentType && matchesStatus;
  }) || [];

  const getRulesStats = () => {
    const total = complianceRules?.length || 0;
    const active = complianceRules?.filter(r => r.isActive).length || 0;
    const inactive = complianceRules?.filter(r => !r.isActive).length || 0;
    
    const equipmentTypeCounts = complianceRules?.reduce((acc, rule) => {
      acc[rule.equipmentType] = (acc[rule.equipmentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    return { total, active, inactive, equipmentTypeCounts };
  };

  const stats = getRulesStats();

  const equipmentTypes = [
    { value: "extinguisher", label: "소화기" },
    { value: "sprinkler", label: "스프링클러" },
    { value: "smoke_detector", label: "연기감지기" },
    { value: "alarm", label: "화재경보기" },
    { value: "emergency_exit", label: "비상구" }
  ];

  const frequencyOptions = [
    { value: 30, label: "매월 (30일)" },
    { value: 90, label: "분기별 (90일)" },
    { value: 180, label: "반기별 (180일)" },
    { value: 365, label: "연간 (365일)" }
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="규정 준수" subtitle="소방 규정 준수 현황 및 관리" />
        <main className="flex-1 overflow-auto p-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">전체 규정</p>
                    <p className="text-2xl font-bold" data-testid="stat-total-rules">{stats.total}</p>
                  </div>
                  <Shield className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">활성 규정</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="stat-active-rules">{stats.active}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">비활성 규정</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="stat-inactive-rules">{stats.inactive}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">정기 점검</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="stat-routine-rules">
                      {complianceRules?.filter(r => r.frequency <= 90).length || 0}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">규정 목록</h2>
              <p className="text-muted-foreground">소방 안전 규정을 관리하고 점검 주기를 설정하세요.</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={resetForm} data-testid="button-add-rule">
                  <Plus className="w-4 h-4" />
                  새 규정 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]" data-testid="dialog-rule-form">
                <DialogHeader>
                  <DialogTitle>
                    {editingRule ? "규정 정보 수정" : "새 규정 추가"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">규정 코드</Label>
                    <Input
                      id="code"
                      data-testid="input-rule-code"
                      value={formData.code}
                      onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="예: FIRE-EXT-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">규정 설명</Label>
                    <Textarea
                      id="description"
                      data-testid="input-rule-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="규정에 대한 상세한 설명을 입력하세요..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="equipmentType">장비 유형</Label>
                    <Select 
                      value={formData.equipmentType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, equipmentType: value }))}
                    >
                      <SelectTrigger data-testid="select-rule-equipment-type">
                        <SelectValue />
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
                    <Label htmlFor="frequency">점검 주기</Label>
                    <Select 
                      value={formData.frequency.toString()} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: parseInt(value) }))}
                    >
                      <SelectTrigger data-testid="select-rule-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      data-testid="switch-rule-active"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">규정 활성화</Label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="flex-1"
                      data-testid="button-save-rule"
                      disabled={createMutation.isPending || updateMutation.isPending}
                    >
                      {editingRule ? "수정" : "추가"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel-rule"
                    >
                      취소
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Select value={selectedEquipmentType} onValueChange={setSelectedEquipmentType}>
              <SelectTrigger className="w-[200px]" data-testid="filter-equipment-type">
                <SelectValue placeholder="장비 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 장비</SelectItem>
                {equipmentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]" data-testid="filter-status">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {rulesLoading ? (
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
                  <Shield className="w-5 h-5" />
                  규정 목록 ({filteredRules.length}개)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredRules.length === 0 ? (
                  <div className="p-8 text-center">
                    <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">등록된 규정이 없습니다</h3>
                    <p className="text-muted-foreground mb-4">새 규정을 추가하여 소방 안전 관리를 시작하세요.</p>
                    <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-rule">
                      <Plus className="w-4 h-4 mr-2" />
                      첫 번째 규정 추가
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>규정 코드</TableHead>
                        <TableHead>설명</TableHead>
                        <TableHead>장비 유형</TableHead>
                        <TableHead>점검 주기</TableHead>
                        <TableHead>상태</TableHead>
                        <TableHead>생성일</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRules.map((rule) => (
                        <TableRow key={rule.id} data-testid={`rule-row-${rule.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-muted-foreground" />
                              {rule.code}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs">
                              <p className="text-sm line-clamp-2">{rule.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getEquipmentTypeColor(rule.equipmentType)}>
                              {getEquipmentTypeLabel(rule.equipmentType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {getFrequencyLabel(rule.frequency)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={rule.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                              {rule.isActive ? "활성" : "비활성"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(rule.createdAt).toLocaleDateString('ko-KR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(rule)}
                                data-testid={`button-edit-rule-${rule.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(rule.id)}
                                data-testid={`button-delete-rule-${rule.id}`}
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