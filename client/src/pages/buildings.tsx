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
import { Building, Edit, Trash, Plus, MapPin } from "lucide-react";
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