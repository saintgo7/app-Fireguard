import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, Wrench, ShieldCheck } from "lucide-react";

export default function StatsCards() {
  const { data: stats, isLoading } = useQuery<{
    totalInspections: number;
    pendingInspections: number;
    totalEquipment: number;
    complianceRate: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              <div className="h-8 bg-muted rounded w-16 mb-4"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "총 점검 완료",
      value: stats?.totalInspections ?? 0,
      icon: CheckCircle,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      trend: "+12.5%",
      trendLabel: "지난 달 대비"
    },
    {
      title: "미완료 점검",
      value: stats?.pendingInspections ?? 0,
      icon: Clock,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
      trend: "-8.2%",
      trendLabel: "지난 달 대비"
    },
    {
      title: "관리 장비",
      value: stats?.totalEquipment ?? 0,
      icon: Wrench,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: "+3.1%",
      trendLabel: "지난 달 대비"
    },
    {
      title: "준수율",
      value: `${stats?.complianceRate ?? 0}%`,
      icon: ShieldCheck,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
      trend: "+0.8%",
      trendLabel: "지난 달 대비"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="p-6" data-testid={`stat-card-${index}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
              </div>
              <div className={`w-12 h-12 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`${card.color} w-6 h-6`} />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-chart-2 text-sm font-medium">{card.trend}</span>
              <span className="text-muted-foreground text-sm ml-2">{card.trendLabel}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
