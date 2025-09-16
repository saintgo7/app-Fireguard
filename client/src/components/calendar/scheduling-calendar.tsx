import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, ChevronLeft, ChevronRight, Clock, User, MapPin, 
  AlertTriangle, CheckCircle, Play, Plus, Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { detectTimeConflicts } from "@/lib/scheduler";
import type { Inspection, User as UserType, Building } from "@shared/schema";

interface SchedulingCalendarProps {
  inspections: Inspection[];
  inspectors: UserType[];
  buildings: Building[];
  onCreateInspection?: (date: Date) => void;
  onEditInspection?: (inspection: Inspection) => void;
  onInspectorChange?: (inspectorId: string) => void;
  selectedInspector?: string;
}

type CalendarView = 'month' | 'week' | 'day';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  inspections: Inspection[];
  workloadHours: number;
  conflicts: boolean;
}

export default function SchedulingCalendar({
  inspections = [],
  inspectors = [],
  buildings = [],
  onCreateInspection,
  onEditInspection,
  onInspectorChange,
  selectedInspector
}: SchedulingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter inspections by selected inspector
  const filteredInspections = useMemo(() => {
    if (!selectedInspector) return inspections;
    return inspections.filter(inspection => inspection.inspectorId === selectedInspector);
  }, [inspections, selectedInspector]);

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstCalendarDay = new Date(firstDay);
    firstCalendarDay.setDate(firstCalendarDay.getDate() - firstCalendarDay.getDay());
    
    const days: CalendarDay[] = [];
    const current = new Date(firstCalendarDay);
    
    // Generate 42 days (6 weeks)
    for (let i = 0; i < 42; i++) {
      const dayInspections = filteredInspections.filter(inspection => {
        const inspectionDate = new Date(inspection.scheduledDate);
        return inspectionDate.toDateString() === current.toDateString();
      });

      // Calculate workload hours (assume 2 hours per inspection)
      const workloadHours = dayInspections.length * 2;

      // Detect conflicts (inspections too close together)
      const conflicts = dayInspections.length > 0 && detectTimeConflicts(dayInspections);

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        inspections: dayInspections,
        workloadHours,
        conflicts
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate, filteredInspections]);

  // Navigate calendar
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  // Get status color for inspection
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get priority color based on workload and conflicts
  const getDayPriorityColor = (day: CalendarDay) => {
    if (day.conflicts) return 'border-red-300 bg-red-50';
    if (day.workloadHours > 8) return 'border-orange-300 bg-orange-50';
    if (day.workloadHours > 4) return 'border-yellow-300 bg-yellow-50';
    if (day.inspections.length > 0) return 'border-green-300 bg-green-50';
    return 'border-gray-200 hover:border-gray-300';
  };

  // Format date for display
  const formatDateHeader = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });
    } else if (view === 'week') {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('ko-KR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              일정 캘린더
            </CardTitle>
            
            {/* Inspector Filter */}
            <Select value={selectedInspector || "all"} onValueChange={(value) => onInspectorChange?.(value === "all" ? "" : value)}>
              <SelectTrigger className="w-48" data-testid="select-inspector-filter">
                <SelectValue placeholder="점검원 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 점검원</SelectItem>
                {inspectors.filter(user => user.role === 'inspector').map(inspector => (
                  <SelectItem key={inspector.id} value={inspector.id}>
                    {inspector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg">
              {(['month', 'week', 'day'] as CalendarView[]).map(viewType => (
                <Button
                  key={viewType}
                  variant={view === viewType ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView(viewType)}
                  className="rounded-none first:rounded-l-lg last:rounded-r-lg"
                  data-testid={`button-view-${viewType}`}
                >
                  {viewType === 'month' ? '월' : viewType === 'week' ? '주' : '일'}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" size="sm" onClick={() => navigate('prev')} data-testid="button-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h3 className="text-lg font-semibold" data-testid="text-current-period">
            {formatDateHeader()}
          </h3>
          
          <Button variant="outline" size="sm" onClick={() => navigate('next')} data-testid="button-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
            <span>정상</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-200 border border-yellow-300 rounded"></div>
            <span>높은 업무량</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-200 border border-orange-300 rounded"></div>
            <span>과부하</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-200 border border-red-300 rounded"></div>
            <span>일정 충돌</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {view === 'month' && (
          <div className="h-full flex flex-col">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b bg-gray-50">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
                <div key={day} className={`p-2 text-center text-sm font-medium ${index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 grid grid-cols-7" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`border-r border-b relative min-h-[100px] cursor-pointer transition-colors ${getDayPriorityColor(day)} ${!day.isCurrentMonth ? 'opacity-50' : ''}`}
                  onClick={() => {
                    setSelectedDate(day.date);
                    if (onCreateInspection) {
                      onCreateInspection(day.date);
                    }
                  }}
                  data-testid={`calendar-day-${day.date.getDate()}`}
                >
                  {/* Date Number */}
                  <div className="absolute top-1 left-2 text-sm font-medium">
                    <span className={day.date.toDateString() === new Date().toDateString() ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs' : ''}>
                      {day.date.getDate()}
                    </span>
                  </div>

                  {/* Workload Indicator */}
                  {day.workloadHours > 0 && (
                    <div className="absolute top-1 right-1 text-xs">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {day.workloadHours}h
                      </Badge>
                    </div>
                  )}

                  {/* Conflict Indicator */}
                  {day.conflicts && (
                    <div className="absolute top-6 right-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    </div>
                  )}

                  {/* Inspections List */}
                  <div className="absolute top-8 left-1 right-1 bottom-1 overflow-hidden">
                    <div className="space-y-1">
                      {day.inspections.slice(0, 3).map(inspection => (
                        <div
                          key={inspection.id}
                          className={`px-1 py-0.5 text-xs rounded border cursor-pointer truncate ${getStatusColor(inspection.status)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditInspection?.(inspection);
                          }}
                          title={`${buildings.find(b => b.id === inspection.buildingId)?.name || '알 수 없는 건물'} - ${inspection.type}`}
                          data-testid={`inspection-${inspection.id}`}
                        >
                          <div className="flex items-center gap-1">
                            {getStatusIcon(inspection.status)}
                            <span className="truncate">
                              {new Date(inspection.scheduledDate).toLocaleTimeString('ko-KR', { 
                                hour: '2-digit', 
                                minute: '2-digit', 
                                hour12: false 
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                      {day.inspections.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{day.inspections.length - 3}개 더
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Week and Day views can be implemented similarly */}
        {view === 'week' && (
          <div className="p-4 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p>주간 보기는 곧 구현될 예정입니다.</p>
          </div>
        )}

        {view === 'day' && (
          <div className="p-4 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <p>일간 보기는 곧 구현될 예정입니다.</p>
          </div>
        )}
      </CardContent>

      {/* Quick Add Button */}
      {onCreateInspection && (
        <div className="absolute bottom-4 right-4">
          <Button
            onClick={() => onCreateInspection(selectedDate || new Date())}
            className="rounded-full w-14 h-14 shadow-lg"
            data-testid="button-quick-add"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}
    </Card>
  );
}

// Helper function to get status icon
function getStatusIcon(status: string) {
  switch (status) {
    case 'scheduled':
      return <Clock className="h-3 w-3" />;
    case 'in_progress':
      return <Play className="h-3 w-3" />;
    case 'completed':
      return <CheckCircle className="h-3 w-3" />;
    default:
      return null;
  }
}