import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function UpcomingTasks() {
  const tasks = [
    {
      title: "소화기 정기점검",
      location: "강남타워 B동",
      dueDate: "2024-01-20",
      priority: "high"
    },
    {
      title: "스프링클러 시스템 점검",
      location: "서초빌딩 전층",
      dueDate: "2024-01-22",
      priority: "medium"
    },
    {
      title: "화재 경보기 배터리 교체",
      location: "역삼센터 3층",
      dueDate: "2024-01-25",
      priority: "low"
    },
    {
      title: "비상구 표시등 점검",
      location: "테헤란로 빌딩",
      dueDate: "2024-01-28",
      priority: "medium"
    }
  ];

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

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">예정된 작업</h3>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {tasks.map((task, index) => (
          <div key={index} className="flex items-start space-x-3" data-testid={`task-item-${index}`}>
            <div className={`w-2 h-2 ${getPriorityColor(task.priority)} rounded-full mt-2 flex-shrink-0`}></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{task.title}</p>
              <p className="text-xs text-muted-foreground">{task.location}</p>
              <p className="text-xs text-muted-foreground">마감: {task.dueDate}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
