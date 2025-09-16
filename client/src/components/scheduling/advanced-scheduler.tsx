import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Calendar, Brain, Users, MapPin, Clock, Zap, TrendingUp, 
  AlertTriangle, CheckCircle, Star, Award, Target, User as UserIcon
} from "lucide-react";
import SchedulingCalendar from "@/components/calendar/scheduling-calendar";
import { AdvancedScheduler as AdvancedSchedulerClass, type AutoAssignmentResult, type SchedulingPreferences, scheduleUtils } from "@/lib/scheduler";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertInspectionSchema, type Inspection, type Building, type User } from "@shared/schema";

const schedulingFormSchema = z.object({
  buildingId: z.string(),
  inspectorId: z.string(),
  type: z.enum(['routine', 'emergency', 'maintenance', 'compliance']),
  scheduledDate: z.date(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
  notes: z.string().nullable().optional(),
  useAutoAssignment: z.boolean().default(false),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  preferredInspectorId: z.string().optional(),
  requireCertification: z.string().optional(),
  allowWeekends: z.boolean().default(false),
  maxTravelDistance: z.number().optional(),
  preferredTimeSlots: z.array(z.string()).default(['morning', 'afternoon']),
});

const batchSchedulingSchema = z.object({
  inspections: z.array(z.object({
    buildingId: z.string(),
    type: z.enum(['routine', 'emergency', 'maintenance', 'compliance']),
    preferredDate: z.date().optional(),
    urgency: z.enum(['low', 'medium', 'high', 'critical']),
    notes: z.string().optional(),
  })),
  globalPreferences: z.object({
    allowWeekends: z.boolean().default(false),
    maxTravelDistance: z.number().optional(),
    preferredTimeSlots: z.array(z.string()).default(['morning', 'afternoon']),
  }),
});

type SchedulingFormData = z.infer<typeof schedulingFormSchema>;

interface AdvancedSchedulerProps {
  onScheduleComplete?: (inspection: Inspection) => void;
  defaultBuildingId?: string;
  defaultDate?: Date;
}

export default function AdvancedScheduler({
  onScheduleComplete,
  defaultBuildingId,
  defaultDate = new Date()
}: AdvancedSchedulerProps) {
  const { toast } = useToast();
  const [currentTab, setCurrentTab] = useState("scheduler");
  const [autoAssignmentResult, setAutoAssignmentResult] = useState<AutoAssignmentResult | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(defaultDate);
  const [batchResults, setBatchResults] = useState<any[] | null>(null);

  // Data queries
  const { data: inspections = [] } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Filter inspectors
  const inspectors = useMemo(() => 
    users.filter(user => user.role === 'inspector'), 
    [users]
  );

  // Initialize scheduler
  const scheduler = useMemo(() => 
    new AdvancedSchedulerClass(inspectors, inspections, buildings), 
    [inspectors, inspections, buildings]
  );

  // Form setup
  const form = useForm<SchedulingFormData>({
    resolver: zodResolver(schedulingFormSchema),
    defaultValues: {
      buildingId: defaultBuildingId || "",
      inspectorId: "",
      type: "routine",
      scheduledDate: defaultDate,
      status: "scheduled",
      notes: "",
      useAutoAssignment: false,
      urgency: "medium",
      allowWeekends: false,
      preferredTimeSlots: ["morning", "afternoon"],
    },
  });

  // Auto-assignment mutation
  const autoAssignMutation = useMutation({
    mutationFn: async (data: SchedulingFormData) => {
      const preferences: SchedulingPreferences = {
        preferredInspectorId: data.preferredInspectorId,
        requireCertification: data.requireCertification,
        urgency: data.urgency,
        allowWeekends: data.allowWeekends,
        preferredTimeSlots: data.preferredTimeSlots,
        maxTravelDistance: data.maxTravelDistance,
      };

      return await scheduler.autoAssignInspector(
        data.buildingId,
        data.scheduledDate,
        data.type,
        preferences
      );
    },
    onSuccess: (result) => {
      setAutoAssignmentResult(result);
      if (result) {
        form.setValue("inspectorId", result.recommendedInspector.id);
        form.setValue("scheduledDate", result.suggestedDate);
        toast({
          title: "자동 배정 완료",
          description: `${result.recommendedInspector.name} 점검원이 추천되었습니다. (신뢰도: ${result.confidence.toFixed(0)}%)`,
        });
      } else {
        toast({
          title: "배정 불가",
          description: "조건에 맞는 점검원을 찾을 수 없습니다. 조건을 완화해보세요.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "오류",
        description: "자동 배정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Batch optimization mutation
  const batchOptimizeMutation = useMutation({
    mutationFn: async (requests: Array<{
      buildingId: string;
      type: string;
      preferredDate?: Date;
      urgency: SchedulingPreferences['urgency'];
      preferences?: SchedulingPreferences;
    }>) => {
      return await scheduler.optimizeSchedule(requests);
    },
    onSuccess: (results) => {
      setBatchResults(results);
      toast({
        title: "배치 최적화 완료",
        description: `${results.length}개의 점검 일정이 최적화되었습니다.`,
      });
    },
    onError: () => {
      toast({
        title: "오류",
        description: "배치 최적화 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Create inspection mutation
  const createInspectionMutation = useMutation({
    mutationFn: async (data: SchedulingFormData) => {
      const inspectionData = {
        buildingId: data.buildingId,
        inspectorId: data.inspectorId,
        type: data.type,
        scheduledDate: data.scheduledDate,
        status: data.status,
        notes: data.notes,
      };
      const response = await apiRequest("POST", "/api/inspections", inspectionData);
      return await response.json();
    },
    onSuccess: (inspection) => {
      // Invalidate multiple related caches for better data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/inspections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] }); // Refresh inspector workloads
      queryClient.invalidateQueries({ queryKey: ["/api/buildings"] }); // Refresh building schedules
      
      setIsDialogOpen(false);
      form.reset({
        buildingId: defaultBuildingId || "",
        inspectorId: "",
        type: "routine",
        scheduledDate: new Date(),
        status: "scheduled",
        notes: "",
        useAutoAssignment: false,
        urgency: "medium",
        allowWeekends: false,
        preferredTimeSlots: ["morning", "afternoon"],
      });
      setAutoAssignmentResult(null);
      setSelectedDate(new Date());
      
      toast({
        title: "성공",
        description: "점검이 성공적으로 예약되었습니다.",
      });
      onScheduleComplete?.(inspection);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "점검 예약에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SchedulingFormData) => {
    if (data.useAutoAssignment && !autoAssignmentResult) {
      toast({
        title: "자동 배정 필요",
        description: "먼저 자동 배정을 실행하세요.",
        variant: "destructive",
      });
      return;
    }
    createInspectionMutation.mutate(data);
  };

  const handleAutoAssign = () => {
    const formData = form.getValues();
    if (!formData.buildingId || !formData.type) {
      toast({
        title: "정보 부족",
        description: "건물과 점검 유형을 먼저 선택하세요.",
        variant: "destructive",
      });
      return;
    }
    autoAssignMutation.mutate(formData);
  };

  const handleCalendarDateSelect = (date: Date) => {
    setSelectedDate(date);
    form.setValue("scheduledDate", date);
    setIsDialogOpen(true);
  };

  const handleCalendarInspectionEdit = (inspection: Inspection) => {
    // Pre-fill form with existing inspection data and reset auto-assignment state
    form.setValue("buildingId", inspection.buildingId);
    form.setValue("inspectorId", inspection.inspectorId);
    form.setValue("type", inspection.type as "routine" | "emergency" | "maintenance" | "compliance");
    form.setValue("scheduledDate", new Date(inspection.scheduledDate));
    form.setValue("status", inspection.status as "scheduled" | "in_progress" | "completed" | "cancelled");
    form.setValue("notes", inspection.notes || "");
    form.setValue("useAutoAssignment", false); // Reset auto-assignment when editing
    
    // Clear any previous auto-assignment results for consistency
    setAutoAssignmentResult(null);
    setSelectedDate(new Date(inspection.scheduledDate));
    setIsDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="h-full flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="scheduler" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              스마트 스케줄러
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              배치 최적화
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              캘린더 보기
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4">
            <TabsContent value="scheduler" className="h-full space-y-6 m-0">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      활성 점검원
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{inspectors.length}</div>
                    <p className="text-xs text-muted-foreground">배정 가능</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      예정된 점검
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {inspections.filter(i => i.status === 'scheduled').length}
                    </div>
                    <p className="text-xs text-muted-foreground">이번 주</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      완료율
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {inspections.length > 0 ? 
                        Math.round((inspections.filter(i => i.status === 'completed').length / inspections.length) * 100) : 0
                      }%
                    </div>
                    <p className="text-xs text-muted-foreground">이번 달</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      충돌 감지
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {scheduleUtils.detectConflicts(inspections).length}
                    </div>
                    <p className="text-xs text-muted-foreground">일정 문제</p>
                  </CardContent>
                </Card>
              </div>

              {/* Smart Scheduling Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-500" />
                    스마트 점검 예약
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="buildingId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>건물 선택</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger data-testid="select-building">
                                      <SelectValue placeholder="건물을 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {buildings.map((building) => (
                                        <SelectItem key={building.id} value={building.id}>
                                          {building.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>점검 유형</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger data-testid="select-type">
                                      <SelectValue placeholder="점검 유형을 선택하세요" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="routine">정기 점검</SelectItem>
                                      <SelectItem value="emergency">긴급 점검</SelectItem>
                                      <SelectItem value="maintenance">유지보수</SelectItem>
                                      <SelectItem value="compliance">규정 준수</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="scheduledDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>희망 일시</FormLabel>
                                <FormControl>
                                  <Input
                                    type="datetime-local"
                                    data-testid="input-scheduled-date"
                                    value={field.value ? new Date(field.value.getTime() - field.value.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="useAutoAssignment"
                            render={({ field }) => (
                              <FormItem>
                                <div className="flex items-center space-x-2">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      data-testid="checkbox-auto-assignment"
                                      className="w-4 h-4"
                                    />
                                  </FormControl>
                                  <FormLabel className="flex items-center gap-2">
                                    <Brain className="h-4 w-4 text-purple-500" />
                                    자동 점검원 배정 사용
                                  </FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          {form.watch("useAutoAssignment") && (
                            <>
                              <FormField
                                control={form.control}
                                name="urgency"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>우선순위</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger data-testid="select-urgency">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="low">낮음</SelectItem>
                                          <SelectItem value="medium">보통</SelectItem>
                                          <SelectItem value="high">높음</SelectItem>
                                          <SelectItem value="critical">긴급</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="preferredInspectorId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>선호 점검원 (선택사항)</FormLabel>
                                    <FormControl>
                                      <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger data-testid="select-preferred-inspector">
                                          <SelectValue placeholder="선호하는 점검원을 선택하세요" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="">자동 선택</SelectItem>
                                          {inspectors.map((inspector) => (
                                            <SelectItem key={inspector.id} value={inspector.id}>
                                              {inspector.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          {!form.watch("useAutoAssignment") && (
                            <FormField
                              control={form.control}
                              name="inspectorId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>점검원 선택</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <SelectTrigger data-testid="select-inspector">
                                        <SelectValue placeholder="점검원을 선택하세요" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {inspectors.map((inspector) => (
                                          <SelectItem key={inspector.id} value={inspector.id}>
                                            {inspector.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>메모</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="점검에 대한 추가 메모를 입력하세요..."
                                data-testid="textarea-notes"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Auto Assignment Results */}
                      {autoAssignmentResult && (
                        <Card className="bg-green-50 border-green-200">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              자동 배정 결과
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Users className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{autoAssignmentResult.recommendedInspector.name}</div>
                                    <div className="text-sm text-gray-500">{autoAssignmentResult.recommendedInspector.email}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant="secondary" className="mb-1">
                                    신뢰도 {autoAssignmentResult.confidence.toFixed(0)}%
                                  </Badge>
                                  <div className="text-xs text-gray-500">
                                    {autoAssignmentResult.suggestedDate.toLocaleDateString('ko-KR')} {autoAssignmentResult.suggestedDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    선정 이유
                                  </h4>
                                  <ul className="space-y-1">
                                    {autoAssignmentResult.reasons.slice(0, 3).map((reason, index) => (
                                      <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                        {reason}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {autoAssignmentResult.alternatives.length > 0 && (
                                  <div>
                                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                                      <Target className="h-4 w-4 text-blue-500" />
                                      대안 점검원
                                    </h4>
                                    <div className="space-y-1">
                                      {autoAssignmentResult.alternatives.slice(0, 2).map((alt, index) => (
                                        <div key={index} className="text-sm flex items-center justify-between p-2 bg-gray-50 rounded">
                                          <span>{alt.inspector.name}</span>
                                          <Badge variant="outline" className="text-xs">
                                            {alt.confidence.toFixed(0)}%
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        {form.watch("useAutoAssignment") && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleAutoAssign}
                            disabled={autoAssignMutation.isPending}
                            data-testid="button-auto-assign"
                            className="flex items-center gap-2"
                          >
                            <Brain className="h-4 w-4" />
                            {autoAssignMutation.isPending ? "배정 중..." : "자동 배정 실행"}
                          </Button>
                        )}
                        
                        <Button
                          type="submit"
                          disabled={createInspectionMutation.isPending || (form.watch("useAutoAssignment") && !autoAssignmentResult)}
                          data-testid="button-schedule"
                          className="flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          {createInspectionMutation.isPending ? "예약 중..." : "점검 예약"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="batch" className="h-full space-y-6 m-0">
              {/* Batch Optimization Interface */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-500" />
                    배치 일정 최적화
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    여러 점검을 한 번에 최적화하여 효율적인 일정을 생성합니다.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Button
                      onClick={() => setIsBatchDialogOpen(true)}
                      className="flex items-center gap-2"
                      data-testid="button-batch-optimize"
                    >
                      <Target className="h-4 w-4" />
                      배치 최적화 시작
                    </Button>
                    {batchResults && (
                      <Button
                        variant="outline"
                        onClick={() => setBatchResults(null)}
                        data-testid="button-clear-results"
                      >
                        결과 초기화
                      </Button>
                    )}
                  </div>

                  {/* Batch Results Display */}
                  {batchResults && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">최적화 결과</h3>
                      <div className="grid gap-4">
                        {batchResults.map((result, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">
                                  {buildings.find(b => b.id === result.request.buildingId)?.name || '알 수 없는 건물'}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {result.request.type} | 우선순위: {result.request.urgency}
                                </p>
                              </div>
                              {result.assignment && (
                                <Badge variant="secondary" className="ml-2">
                                  신뢰도: {result.assignment.confidence.toFixed(0)}%
                                </Badge>
                              )}
                            </div>
                            
                            {result.assignment ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <UserIcon className="h-4 w-4 text-blue-500" />
                                  <span>{result.assignment.recommendedInspector.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-green-500" />
                                  <span>{result.assignment.suggestedDate.toLocaleString('ko-KR')}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  추천 이유: {result.assignment.reasons.join(', ')}
                                </div>
                                
                                {result.conflicts && result.conflicts.length > 0 && (
                                  <div className="flex items-center gap-2 text-amber-600">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="text-sm">충돌: {result.conflicts.join(', ')}</span>
                                  </div>
                                )}
                                
                                {result.workloadImpact && (
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm">업무량 영향: {result.workloadImpact.toFixed(0)}%</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-red-600 text-sm">
                                배정 불가 - 조건에 맞는 점검원을 찾을 수 없습니다
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                      
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            // Apply all successful assignments
                            const successfulAssignments = batchResults.filter(r => r.assignment);
                            // Implementation would create multiple inspections
                            toast({
                              title: "배치 적용 완료",
                              description: `${successfulAssignments.length}개의 점검이 예약되었습니다.`,
                            });
                          }}
                          data-testid="button-apply-batch"
                        >
                          배치 결과 적용
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="h-full m-0">
              <SchedulingCalendar
                inspections={inspections}
                inspectors={inspectors}
                buildings={buildings}
                onCreateInspection={handleCalendarDateSelect}
                onEditInspection={handleCalendarInspectionEdit}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Batch Optimization Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              배치 최적화 설정
            </DialogTitle>
            <DialogDescription>
              여러 점검을 동시에 최적화하여 효율적인 일정을 생성합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Sample Batch Requests for Demo */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">샘플 배치 최적화</h3>
              <p className="text-sm text-muted-foreground">
                데모를 위한 샘플 점검 요청들입니다. 실제 환경에서는 사용자가 직접 구성할 수 있습니다.
              </p>
              
              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    // Demo batch optimization with sample data
                    const sampleRequests = [
                      {
                        buildingId: buildings[0]?.id || '',
                        type: 'routine',
                        urgency: 'medium' as const,
                        preferences: {
                          urgency: 'medium' as const,
                          allowWeekends: false,
                          preferredTimeSlots: ['morning', 'afternoon'],
                          maxTravelDistance: 15,
                        }
                      },
                      {
                        buildingId: buildings[1]?.id || '',
                        type: 'maintenance',
                        urgency: 'high' as const,
                        preferences: {
                          urgency: 'high' as const,
                          allowWeekends: true,
                          preferredTimeSlots: ['morning'],
                          maxTravelDistance: 10,
                        }
                      },
                      {
                        buildingId: buildings[2]?.id || '',
                        type: 'compliance',
                        urgency: 'low' as const,
                        preferences: {
                          urgency: 'low' as const,
                          allowWeekends: false,
                          preferredTimeSlots: ['afternoon', 'evening'],
                          maxTravelDistance: 20,
                        }
                      }
                    ].filter(req => req.buildingId); // Only include requests with valid building IDs

                    if (sampleRequests.length > 0) {
                      batchOptimizeMutation.mutate(sampleRequests);
                      setIsBatchDialogOpen(false);
                    } else {
                      toast({
                        title: "데이터 부족",
                        description: "배치 최적화를 위한 건물 데이터가 부족합니다.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={batchOptimizeMutation.isPending || buildings.length < 2}
                  data-testid="button-run-sample-batch"
                >
                  {batchOptimizeMutation.isPending ? "최적화 중..." : "샘플 배치 실행"}
                </Button>
                
                <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
                  취소
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Schedule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>빠른 점검 예약</DialogTitle>
            <DialogDescription>
              {selectedDate.toLocaleDateString('ko-KR')}에 점검을 예약합니다.
            </DialogDescription>
          </DialogHeader>
          {/* Dialog form content would go here */}
        </DialogContent>
      </Dialog>
    </div>
  );
}