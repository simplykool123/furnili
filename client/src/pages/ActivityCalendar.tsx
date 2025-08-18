import React, { useState } from 'react';
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar, Plus, Clock, User, CheckCircle, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import FurniliLayout from "@/components/Layout/FurniliLayout";

interface Activity {
  id: number;
  projectId?: number;
  type: string;
  description: string;
  date: string;
  userId?: number;
  user?: { name: string };
  taskId?: number;
  task?: { title: string; status: string; priority: string };
}

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedUser?: { name: string };
  project?: { code: string; name: string };
}

export default function ActivityCalendar() {
  const { id: projectId } = useParams();
  const [, setLocation] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: 'task',
    description: '',
    date: new Date().toISOString().split('T')[0],
    taskTitle: '',
    taskPriority: 'medium',
    taskAssignedTo: '',
    taskDueDate: '',
  });
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();

  const today = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Fetch project activities and tasks
  const { data: activities = [] } = useQuery({
    queryKey: [`/api/projects/${projectId}/activities`],
    select: (data: unknown) => Array.isArray(data) ? data as Activity[] : [],
  });

  const { data: tasks = [] } = useQuery({
    queryKey: [`/api/tasks`],
    select: (data: Task[]) => {
      if (!Array.isArray(data)) return [];
      return data.filter(task => 
        projectId ? (task.project as any)?.id?.toString() === projectId : true
      );
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  const addActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.type === 'task') {
        // Create task first
        const taskData = {
          title: data.taskTitle,
          description: data.description,
          priority: data.taskPriority,
          assignedTo: data.taskAssignedTo,
          dueDate: data.taskDueDate,
          projectId: projectId ? parseInt(projectId) : null,
        };
        
        const taskResponse = await authenticatedApiRequest('POST', '/api/tasks', taskData);
        
        // Then create activity linked to the task
        const activityData = {
          type: 'task',
          description: `Task created: ${data.taskTitle}`,
          date: data.date,
          taskId: taskResponse.id,
        };
        
        return authenticatedApiRequest('POST', `/api/projects/${projectId}/activities`, activityData);
      } else {
        return authenticatedApiRequest('POST', `/api/projects/${projectId}/activities`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/activities`] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Activity added",
        description: "Activity has been added successfully.",
      });
      setIsAddingActivity(false);
      setActivityForm({
        type: 'task',
        description: '',
        date: new Date().toISOString().split('T')[0],
        taskTitle: '',
        taskPriority: 'medium',
        taskAssignedTo: '',
        taskDueDate: '',
      });
    },
  });

  const navigateMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + direction)));
  };

  const getActivitiesForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    
    // Get activities for this date
    const dayActivities = Array.isArray(activities) ? activities.filter((activity: Activity) => {
      const activityDate = new Date(activity.date).toISOString().split('T')[0];
      return activityDate === dateString;
    }) : [];

    // Get tasks due on this date
    const dayTasks = Array.isArray(tasks) ? tasks.filter((task: Task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
      return taskDate === dateString;
    }) : [];

    return { activities: dayActivities, tasks: dayTasks };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "in_progress": return "bg-blue-100 text-blue-800 border-blue-300";
      case "done": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task": return "📋";
      case "meeting": return "👥";
      case "deadline": return "⏰";
      case "milestone": return "🎯";
      default: return "📝";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activityForm.type === 'task' && !activityForm.taskTitle.trim()) {
      toast({
        title: "Error",
        description: "Task title is required.",
        variant: "destructive",
      });
      return;
    }
    addActivityMutation.mutate(activityForm);
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = lastDayOfMonth.getDate();

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[140px] border border-gray-200 bg-gray-50"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = date.toDateString() === today.toDateString();
      const { activities: dayActivities, tasks: dayTasks } = getActivitiesForDate(date);

      days.push(
        <div
          key={day}
          className={`min-h-[140px] border border-gray-200 p-2 ${
            isToday ? 'bg-blue-50 border-blue-300' : 'bg-white'
          } hover:bg-gray-50 transition-colors`}
        >
          <div className={`text-sm font-medium mb-2 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
            {day}
            {isToday && <span className="ml-1 text-xs text-blue-500">(Today)</span>}
          </div>
          
          <div className="space-y-1">
            {/* Activities */}
            {dayActivities.slice(0, 2).map((activity: Activity) => (
              <div
                key={activity.id}
                className={`cursor-pointer p-1 text-xs rounded border hover:shadow-sm transition-shadow ${
                  activity.taskId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                }`}
                style={{ fontSize: '10px' }}
                onClick={() => activity.taskId && setLocation(`/tasks/${activity.taskId}`)}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span>{getActivityIcon(activity.type)}</span>
                  <span className="font-medium text-gray-600">{activity.type}</span>
                </div>
                <div className="text-gray-700 truncate" title={activity.description}>
                  {activity.description}
                </div>
                {activity.task && (
                  <Badge className={`${getStatusColor(activity.task.status)} text-[8px] px-1 py-0 mt-1`}>
                    {activity.task.status}
                  </Badge>
                )}
              </div>
            ))}

            {/* Tasks due this date */}
            {dayTasks.slice(0, 2).map((task: Task) => (
              <div
                key={`task-${task.id}`}
                onClick={() => setLocation(`/tasks/${task.id}`)}
                className="cursor-pointer p-1 text-xs rounded border hover:shadow-sm transition-shadow bg-amber-50 border-amber-200"
                style={{ fontSize: '10px' }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span>{getPriorityIcon(task.priority)}</span>
                  <span className="font-medium text-amber-600">Due</span>
                </div>
                <div className="font-medium truncate" title={task.title}>
                  {task.title}
                </div>
                <Badge className={`${getStatusColor(task.status)} text-[8px] px-1 py-0`}>
                  {task.status}
                </Badge>
              </div>
            ))}
            
            {(dayActivities.length + dayTasks.length) > 4 && (
              <div className="text-xs text-gray-500 text-center">
                +{(dayActivities.length + dayTasks.length) - 4} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <FurniliLayout
      title="Activity Calendar"
      subtitle="Project activities and task timeline"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold min-w-[200px] text-center">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
            <DialogTrigger asChild>
              <Button className="bg-amber-600 hover:bg-amber-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Activity</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="type">Activity Type</Label>
                  <Select 
                    value={activityForm.type}
                    onValueChange={(value) => setActivityForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="milestone">Milestone</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {activityForm.type === 'task' && (
                  <>
                    <div>
                      <Label htmlFor="taskTitle">Task Title</Label>
                      <Input
                        id="taskTitle"
                        value={activityForm.taskTitle}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, taskTitle: e.target.value }))}
                        placeholder="Enter task title"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="taskPriority">Priority</Label>
                      <Select 
                        value={activityForm.taskPriority}
                        onValueChange={(value) => setActivityForm(prev => ({ ...prev, taskPriority: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="taskAssignedTo">Assign To</Label>
                      <Select 
                        value={activityForm.taskAssignedTo}
                        onValueChange={(value) => setActivityForm(prev => ({ ...prev, taskAssignedTo: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(users) && users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="taskDueDate">Due Date</Label>
                      <Input
                        id="taskDueDate"
                        type="date"
                        value={activityForm.taskDueDate}
                        onChange={(e) => setActivityForm(prev => ({ ...prev, taskDueDate: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={activityForm.description}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={activityForm.type === 'task' ? "Task description (optional)" : "Activity description"}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={activityForm.date}
                    onChange={(e) => setActivityForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddingActivity(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addActivityMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {addActivityMutation.isPending ? "Adding..." : "Add Activity"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Calendar */}
        <Card>
          <CardContent className="p-0">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 border-b border-gray-200">
              {dayNames.map((day) => (
                <div key={day} className="p-4 text-center font-medium text-gray-600 bg-gray-50">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-7">
              {renderCalendarDays()}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span>Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>Meetings</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⏰</span>
                <span>Deadlines</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🎯</span>
                <span>Milestones</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <span>Activities</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-200 rounded"></div>
                <span>Task Due</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🔴🟡🟢</span>
                <span>Priority</span>
              </div>
              <div className="text-gray-500">
                Click items to view details
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FurniliLayout>
  );
}