import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Download, Play, Edit, Trash, Eye, Square, RotateCcw } from "lucide-react";
import type { Inspection } from "@shared/schema";

export default function InspectionScheduleTable() {
  const { data: inspections, isLoading } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mb-4"></div>
            <div className="flex space-x-4">
              <div className="h-10 bg-muted rounded w-32"></div>
              <div className="h-10 bg-muted rounded w-24"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-chart-2/10 text-chart-2";
      case "in_progress":
        return "bg-chart-4/10 text-chart-4";
      case "overdue":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "완료";
      case "in_progress":
        return "진행 중";
      case "overdue":
        return "지연";
      case "scheduled":
        return "예정";
      default:
        return status;
    }
  };

  const getActionButtons = (inspection: Inspection) => {
    switch (inspection.status) {
      case "scheduled":
        return (
          <>
            <Button variant="ghost" size="icon" title="점검 시작" data-testid={`button-start-${inspection.id}`}>
              <Play className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="수정" data-testid={`button-edit-${inspection.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="삭제" data-testid={`button-delete-${inspection.id}`}>
              <Trash className="w-4 h-4" />
            </Button>
          </>
        );
      case "in_progress":
        return (
          <>
            <Button variant="ghost" size="icon" title="상세 보기" data-testid={`button-view-${inspection.id}`}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="수정" data-testid={`button-edit-${inspection.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="중지" data-testid={`button-stop-${inspection.id}`}>
              <Square className="w-4 h-4" />
            </Button>
          </>
        );
      case "overdue":
        return (
          <>
            <Button variant="ghost" size="icon" title="재시작" data-testid={`button-restart-${inspection.id}`}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="수정" data-testid={`button-edit-${inspection.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="삭제" data-testid={`button-delete-${inspection.id}`}>
              <Trash className="w-4 h-4" />
            </Button>
          </>
        );
      default:
        return (
          <>
            <Button variant="ghost" size="icon" title="상세 보기" data-testid={`button-view-${inspection.id}`}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="수정" data-testid={`button-edit-${inspection.id}`}>
              <Edit className="w-4 h-4" />
            </Button>
          </>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">이번 주 점검 일정</h3>
          <div className="flex items-center space-x-3">
            <Select defaultValue="all">
              <SelectTrigger className="w-32" data-testid="select-building-filter">
                <SelectValue placeholder="건물 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 건물</SelectItem>
                <SelectItem value="building1">강남타워</SelectItem>
                <SelectItem value="building2">서초빌딩</SelectItem>
                <SelectItem value="building3">역삼센터</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" data-testid="button-export-schedule">
              <Download className="w-4 h-4" />
              내보내기
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">건물명</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">점검 유형</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">담당자</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">일정</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">상태</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inspections?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <p className="text-muted-foreground">점검 일정이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                inspections?.slice(0, 10).map((inspection) => (
                  <tr 
                    key={inspection.id} 
                    className="hover:bg-muted/50 transition-colors"
                    data-testid={`schedule-row-${inspection.id}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Building className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{inspection.buildingId}</p>
                          <p className="text-xs text-muted-foreground">주소 정보</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-foreground">{inspection.type}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary-foreground">담</span>
                        </div>
                        <span className="text-sm text-foreground">{inspection.inspectorId}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(inspection.scheduledDate).toLocaleDateString('ko-KR')}
                        </p>
                        <p className="text-xs text-muted-foreground">09:00 - 12:00</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inspection.status)}`}>
                        {getStatusText(inspection.status)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        {getActionButtons(inspection)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
