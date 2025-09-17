import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Edit, Trash2, UserCheck } from "lucide-react";
import { createUserSchema, updateUserSchema, type User } from "@shared/schema";

// Inspector form validation schemas for create and update
const createInspectorFormSchema = createUserSchema.extend({
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

const updateInspectorFormSchema = updateUserSchema.extend({
  confirmPassword: z.string().optional()
}).refine((data) => {
  // Only validate password confirmation if password is provided
  if (data.password && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
});

type CreateInspectorFormData = z.infer<typeof createInspectorFormSchema>;
type UpdateInspectorFormData = z.infer<typeof updateInspectorFormSchema>;

type InspectorWithoutPassword = Omit<User, 'password'>;

export default function Inspectors() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInspector, setEditingInspector] = useState<InspectorWithoutPassword | null>(null);

  // Fetch inspectors
  const { data: inspectors = [], isLoading } = useQuery<InspectorWithoutPassword[]>({
    queryKey: ["/api/inspectors"],
  });

  // Create inspector mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateInspectorFormData) => {
      const { confirmPassword, ...inspectorData } = data;
      const res = await apiRequest("POST", "/api/inspectors", inspectorData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspectors"] });
      setIsDialogOpen(false);
      form.reset(getDefaultFormValues());
      toast({
        title: "성공",
        description: "점검원이 성공적으로 추가되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error?.details ? "입력된 데이터를 확인해주세요." : "점검원 추가에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Update inspector mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInspectorFormData }) => {
      const { confirmPassword, ...inspectorData } = data;
      // Remove empty password fields to avoid sending empty strings
      if (!inspectorData.password) {
        delete inspectorData.password;
      }
      const res = await apiRequest("PUT", `/api/inspectors/${id}`, inspectorData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspectors"] });
      setEditingInspector(null);
      setIsDialogOpen(false);
      form.reset(getDefaultFormValues());
      toast({
        title: "성공",
        description: "점검원 정보가 성공적으로 수정되었습니다.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error?.details ? "입력된 데이터를 확인해주세요." : "점검원 정보 수정에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Delete inspector mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/inspectors/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspectors"] });
      toast({
        title: "성공",
        description: "점검원이 성공적으로 삭제되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "점검원 삭제에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // Helper function for default form values
  const getDefaultFormValues = () => ({
    username: "",
    password: "",
    confirmPassword: "",
    name: "",
    email: "",
    role: "inspector" as const,
    certificationNumber: "",
  });

  // Form for add/edit inspector - use different resolvers based on edit mode
  const form = useForm<CreateInspectorFormData | UpdateInspectorFormData>({
    resolver: zodResolver(editingInspector ? updateInspectorFormSchema : createInspectorFormSchema),
    defaultValues: getDefaultFormValues(),
  });

  // Filter inspectors based on search term
  const filteredInspectors = inspectors.filter((inspector: InspectorWithoutPassword) =>
    inspector.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inspector.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inspector.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inspector.certificationNumber && inspector.certificationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const onSubmit = (data: CreateInspectorFormData | UpdateInspectorFormData) => {
    if (editingInspector) {
      updateMutation.mutate({ id: editingInspector.id, data: data as UpdateInspectorFormData });
    } else {
      createMutation.mutate(data as CreateInspectorFormData);
    }
  };

  const handleEdit = (inspector: InspectorWithoutPassword) => {
    setEditingInspector(inspector);
    // Reset form with inspector data, leaving password fields empty for security
    form.reset({
      username: inspector.username,
      password: "", // Don't populate password for security
      confirmPassword: "",
      name: inspector.name,
      email: inspector.email,
      role: inspector.role,
      certificationNumber: inspector.certificationNumber || "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingInspector(null);
    form.reset(getDefaultFormValues());
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="점검원 관리" subtitle="점검원 정보 및 권한 관리" />
        <main className="flex-1 overflow-auto p-6">
          {/* Header with search and add button */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                data-testid="input-search-inspectors"
                placeholder="점검원 검색 (이름, 사용자명, 이메일, 자격증 번호)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-inspector" onClick={() => handleCloseDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  점검원 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingInspector ? "점검원 정보 수정" : "새 점검원 추가"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingInspector ? "점검원의 정보를 수정하세요." : "새로운 점검원을 추가하세요."}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>사용자명</FormLabel>
                          <FormControl>
                            <Input data-testid="input-username" placeholder="사용자명 입력" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이름</FormLabel>
                          <FormControl>
                            <Input data-testid="input-name" placeholder="이름 입력" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이메일</FormLabel>
                          <FormControl>
                            <Input data-testid="input-email" type="email" placeholder="이메일 입력" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="certificationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>자격증 번호 (선택사항)</FormLabel>
                          <FormControl>
                            <Input data-testid="input-certification" placeholder="자격증 번호 입력" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            비밀번호
                            {editingInspector && <span className="text-muted-foreground text-sm"> (선택사항 - 비워두면 변경되지 않음)</span>}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              data-testid="input-password" 
                              type="password" 
                              placeholder={editingInspector ? "새 비밀번호 입력 (선택사항)" : "비밀번호 입력"} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            비밀번호 확인
                            {editingInspector && <span className="text-muted-foreground text-sm"> (선택사항)</span>}
                          </FormLabel>
                          <FormControl>
                            <Input 
                              data-testid="input-confirm-password" 
                              type="password" 
                              placeholder={editingInspector ? "새 비밀번호 재입력 (선택사항)" : "비밀번호 재입력"} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseDialog}
                        className="flex-1"
                        data-testid="button-cancel"
                      >
                        취소
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        className="flex-1"
                        data-testid="button-submit-inspector"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? "처리 중..."
                          : editingInspector
                          ? "수정"
                          : "추가"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="text-muted-foreground">점검원 목록을 불러오는 중...</div>
            </div>
          )}

          {/* Inspectors grid */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInspectors.length > 0 ? (
                filteredInspectors.map((inspector: InspectorWithoutPassword) => (
                  <Card key={inspector.id} className="hover:shadow-md transition-shadow" data-testid={`card-inspector-${inspector.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-primary" />
                            <span data-testid={`text-name-${inspector.id}`}>{inspector.name}</span>
                          </CardTitle>
                          <CardDescription data-testid={`text-username-${inspector.id}`}>@{inspector.username}</CardDescription>
                        </div>
                        <Badge variant="secondary" data-testid={`badge-role-${inspector.id}`}>
                          {inspector.role === "inspector" ? "점검원" : inspector.role}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-muted-foreground">이메일:</span>
                          <div data-testid={`text-email-${inspector.id}`} className="text-foreground">{inspector.email}</div>
                        </div>
                        {inspector.certificationNumber && (
                          <div>
                            <span className="font-medium text-muted-foreground">자격증 번호:</span>
                            <div data-testid={`text-certification-${inspector.id}`} className="text-foreground">{inspector.certificationNumber}</div>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-muted-foreground">가입일:</span>
                          <div data-testid={`text-created-${inspector.id}`} className="text-foreground">
                            {new Date(inspector.createdAt).toLocaleDateString("ko-KR")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(inspector)}
                          className="flex-1"
                          data-testid={`button-edit-${inspector.id}`}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          수정
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                              data-testid={`button-delete-${inspector.id}`}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>점검원 삭제 확인</AlertDialogTitle>
                              <AlertDialogDescription>
                                정말로 <strong>{inspector.name}</strong> 점검원을 삭제하시겠습니까?
                                이 작업은 되돌릴 수 없습니다.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid={`button-cancel-delete-${inspector.id}`}>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(inspector.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                data-testid={`button-confirm-delete-${inspector.id}`}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-no-inspectors">
                    {searchTerm ? "검색 결과가 없습니다" : "등록된 점검원이 없습니다"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? "다른 검색어로 다시 시도해보세요."
                      : "새로운 점검원을 추가하여 시작하세요."
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-inspector">
                      <Plus className="mr-2 h-4 w-4" />
                      첫 번째 점검원 추가
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}