import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { FireExtinguisher, Droplets, Cigarette, Bell } from "lucide-react";
import type { Equipment } from "@shared/schema";

export default function EquipmentStatus() {
  const { data: equipment, isLoading } = useQuery<Equipment[]>({
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

  const getEquipmentStatusInfo = (type: string) => {
    // Handle multiple type values that exist in the data
    const typeVariants = {
      'extinguisher': ['extinguisher', 'fire_extinguisher'],
      'sprinkler': ['sprinkler'],
      'smoke_detector': ['smoke_detector'],
      'alarm': ['alarm', 'fire_alarm']
    };
    
    const typesToMatch = typeVariants[type as keyof typeof typeVariants] || [type];
    const typeEquipment = equipment?.filter(e => typesToMatch.includes(e.type)) || [];
    const activeCount = typeEquipment.filter(e => e.status === "active").length;
    const maintenanceCount = typeEquipment.filter(e => e.status === "maintenance").length;
    const totalCount = typeEquipment.length;
    
    let statusText: string;
    let color: string;
    
    if (totalCount === 0) {
      statusText = "장비 없음";
      color = "text-muted-foreground";
    } else if (maintenanceCount > 0) {
      statusText = `점검 필요 ${maintenanceCount}개`;
      color = "text-chart-4";
    } else {
      const percentage = Math.round((activeCount / totalCount) * 100);
      statusText = `정상 ${percentage}%`;
      color = "text-chart-2";
    }
    
    return {
      count: totalCount,
      status: statusText,
      color
    };
  };

  const equipmentTypes = [
    {
      name: "소화기",
      icon: FireExtinguisher,
      type: "extinguisher",
      bgColor: "bg-chart-2/10"
    },
    {
      name: "스프링클러",
      icon: Droplets,
      type: "sprinkler",
      bgColor: "bg-primary/10"
    },
    {
      name: "연기 감지기",
      icon: Cigarette,
      type: "smoke_detector",
      bgColor: "bg-chart-4/10"
    },
    {
      name: "화재 경보기",
      icon: Bell,
      type: "alarm",
      bgColor: "bg-chart-1/10"
    }
  ];

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">장비 현황</h3>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {equipmentTypes.map((equipmentType, index) => {
          const Icon = equipmentType.icon;
          const statusInfo = getEquipmentStatusInfo(equipmentType.type);
          
          return (
            <div key={index} className="flex items-center justify-between" data-testid={`equipment-type-${index}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 ${equipmentType.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${statusInfo.color} w-4 h-4`} />
                </div>
                <span className="text-sm font-medium text-foreground">{equipmentType.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{statusInfo.count}</p>
                <p className={`text-xs ${statusInfo.color}`}>{statusInfo.status}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
