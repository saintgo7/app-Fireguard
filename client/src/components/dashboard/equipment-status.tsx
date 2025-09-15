import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FireExtinguisher, Droplets, Cigarette, Bell } from "lucide-react";

export default function EquipmentStatus() {
  const { data: equipment, isLoading } = useQuery<any[]>({
    queryKey: ["/api/equipment"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-24"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const equipmentTypes = [
    {
      name: "소화기",
      icon: FireExtinguisher,
      count: equipment?.filter((e: any) => e.type === "extinguisher").length ?? 0,
      status: "정상 98%",
      color: "text-chart-2",
      bgColor: "bg-chart-2/10"
    },
    {
      name: "스프링클러",
      icon: Droplets,
      count: equipment?.filter((e: any) => e.type === "sprinkler").length ?? 0,
      status: "정상 96%",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      name: "연기 감지기",
      icon: Cigarette,
      count: equipment?.filter((e: any) => e.type === "smoke_detector").length ?? 0,
      status: "점검 필요 12개",
      color: "text-chart-4",
      bgColor: "bg-chart-4/10"
    },
    {
      name: "화재 경보기",
      icon: Bell,
      count: equipment?.filter((e: any) => e.type === "alarm").length ?? 0,
      status: "정상 99%",
      color: "text-chart-1",
      bgColor: "bg-chart-1/10"
    }
  ];

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">장비 현황</h3>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {equipmentTypes.map((equipment, index) => {
          const Icon = equipment.icon;
          return (
            <div key={index} className="flex items-center justify-between" data-testid={`equipment-type-${index}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${equipment.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${equipment.color} w-4 h-4`} />
                </div>
                <span className="text-sm font-medium text-foreground">{equipment.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{equipment.count}</p>
                <p className="text-xs text-chart-2">{equipment.status}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
