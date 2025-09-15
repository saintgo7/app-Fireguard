import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Inspection, Building } from "@shared/schema";

export default function UpcomingTasks() {
  const { data: inspections, isLoading: inspectionsLoading } = useQuery<Inspection[]>({
    queryKey: ["/api/inspections"],
  });

  const { data: buildings } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
  });

  const upcomingInspections = inspections?.filter(inspection => {
    const scheduledDate = new Date(inspection.scheduledDate);
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return inspection.status === "scheduled" && 
           scheduledDate >= today && 
           scheduledDate <= nextWeek;
  }).sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  ).slice(0, 4) || [];

  const getTaskTitle = (inspection: Inspection) => {
    switch (inspection.type) {
      case "routine": return "정기점검";
      case "regular": return "정기점검"; // Handle actual data value
      case "emergency": return "긴급점검";
      case "annual": return "연간점검";
      default: return "점검";
    }
  };

  const getBuildingName = (buildingId: string) => {
    const building = buildings?.find(b => b.id === buildingId);
    return building?.name || "알 수 없는 건물";
  };

  const getTaskPriority = (inspection: Inspection) => {
    const scheduledDate = new Date(inspection.scheduledDate);
    const today = new Date();
    const daysDiff = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) return "high";
    if (daysDiff <= 3) return "medium";
    return "low";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive";
      case "medium":
        return "bg-chart-4";
      case "low":
        return "bg-chart-2";
      default:
        return "bg-primary";
    }
  };

  if (inspectionsLoading) {
    return (
      <Card>
        <CardHeader className="border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">예정된 작업</h3>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="h-12 bg-muted rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">예정된 작업</h3>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {upcomingInspections.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">예정된 점검이 없습니다</p>
          </div>
        ) : (
          upcomingInspections.map((inspection, index) => {
            const priority = getTaskPriority(inspection);
            const scheduledDate = new Date(inspection.scheduledDate);
            
            return (
              <div key={inspection.id} className="flex items-start space-x-3" data-testid={`task-item-${index}`}>
                <div className={`w-2 h-2 ${getPriorityColor(priority)} rounded-full mt-2 flex-shrink-0`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{getTaskTitle(inspection)}</p>
                  <p className="text-xs text-muted-foreground">{getBuildingName(inspection.buildingId)}</p>
                  <p className="text-xs text-muted-foreground">
                    예정일: {scheduledDate.toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
