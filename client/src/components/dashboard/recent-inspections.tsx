import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";
import type { Inspection } from "@shared/schema";

export default function RecentInspections() {
  const { data: inspections, isLoading } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mb-2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentInspections = inspections?.slice(0, 4) || [];

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

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">최근 점검 현황</h3>
          <Button variant="ghost" className="text-primary hover:text-primary/80 text-sm font-medium">
            전체 보기 →
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {recentInspections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">최근 점검 데이터가 없습니다.</p>
            </div>
          ) : (
            recentInspections.map((inspection) => (
              <div 
                key={inspection.id} 
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                data-testid={`inspection-item-${inspection.id}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-chart-2/10 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{inspection.buildingId}</p>
                    <p className="text-sm text-muted-foreground">점검자: {inspection.inspectorId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inspection.status)}`}>
                    {getStatusText(inspection.status)}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(inspection.scheduledDate).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
