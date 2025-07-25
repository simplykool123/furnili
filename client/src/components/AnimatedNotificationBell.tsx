import { useState, useEffect } from "react";
import { Bell, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedByUser?: {
    id: number;
    name: string;
    username: string;
  };
}

export function AnimatedNotificationBell() {
  const [, setLocation] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasNewTasks, setHasNewTasks] = useState(false);
  const [previousTaskCount, setPreviousTaskCount] = useState(0);
  const [showGlow, setShowGlow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: tasks = [], error, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/dashboard/tasks"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Count pending and in-progress tasks (using lowercase status values)
  const taskCount = tasks.filter(task => 
    task.status === 'pending' || task.status === 'in_progress'
  ).length;

  // Trigger animation when new tasks are added
  useEffect(() => {
    if (taskCount > previousTaskCount) {
      setHasNewTasks(true);
      setIsAnimating(true);
      setShowGlow(true);
      
      // Stop intensive animation after 3 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setHasNewTasks(false);
        setShowGlow(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    setPreviousTaskCount(taskCount);
  }, [taskCount, previousTaskCount]);

  // Removed continuous animation - only animate on new tasks
  // useEffect(() => {
  //   if (taskCount > 0 && !isAnimating) {
  //     const interval = setInterval(() => {
  //       setIsAnimating(true);
  //       setTimeout(() => setIsAnimating(false), 800);
  //     }, 4000);
  //     return () => clearInterval(interval);
  //   }
  // }, [taskCount, isAnimating]);

  // Priority tasks pulse effect
  const hasHighPriorityTasks = tasks.some(task => task.priority === 'high');

  // Always show the bell for consistency

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "relative group transition-all duration-300 hover:bg-amber-50 rounded-full p-2",
              showGlow && "animate-glow-ring",
              hasNewTasks && "animate-bell-bounce"
            )}
          >
            <div className="relative">
              {/* Bell Icon with dynamic animations */}
              <Bell 
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  hasHighPriorityTasks ? "text-red-500" : "text-amber-600"
                )} 
              />
              
              {/* Removed animated ripple effects */}
              
              {/* Task count badge */}
              {taskCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className={cn(
                    "absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center font-bold border-2 border-white",
                    hasHighPriorityTasks ? "bg-red-600" : "bg-red-500"
                  )}
                >
                  {taskCount > 9 ? '9+' : taskCount}
                </Badge>
              )}
              
              {/* Priority indicator with different animations */}
              {hasHighPriorityTasks && (
                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
              )}
              
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 animate-shimmer transition-opacity duration-300"></div>
            </div>
            
            {/* Enhanced tooltip with animation */}
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-lg scale-95 group-hover:scale-100">
              <div className="font-medium">
                {taskCount} pending task{taskCount !== 1 ? 's' : ''}
              </div>
              {hasHighPriorityTasks && (
                <div className="text-red-300 text-xs">High priority tasks!</div>
              )}
              {/* Tooltip arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          {/* Header with animation */}
          <div className="px-4 py-3 border-b bg-gradient-to-r from-amber-50 to-orange-50 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <div className="relative">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                {hasHighPriorityTasks && (
                  <div className="absolute -inset-1 bg-red-500 rounded-full opacity-20 animate-ping"></div>
                )}
              </div>
              <span className="font-semibold text-sm text-amber-800">
                {taskCount} Pending Task{taskCount !== 1 ? 's' : ''}
              </span>
              {hasHighPriorityTasks && (
                <Badge variant="destructive" className="text-xs animate-pulse">
                  URGENT
                </Badge>
              )}
            </div>
          </div>
          
          {tasks.length === 0 ? (
            <DropdownMenuItem disabled className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-400 animate-pulse" />
                <span className="text-gray-500">All caught up!</span>
              </div>
            </DropdownMenuItem>
          ) : (
            tasks.map((task, index) => (
              <DropdownMenuItem
                key={task.id}
                onClick={() => setLocation(`/tasks/${task.id}`)}
                className={cn(
                  "flex flex-col items-start p-4 cursor-pointer hover:bg-amber-50 transition-all duration-200 transform hover:scale-[1.02]",
                  index < tasks.length - 1 && "border-b border-gray-100",
                  task.priority === 'high' && "bg-red-50/30 hover:bg-red-50 border-l-4 border-l-red-400"
                )}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="flex-shrink-0 mt-1">
                    {task.priority === 'high' ? (
                      <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                    ) : task.priority === 'medium' ? (
                      <Clock className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate flex items-center gap-2">
                      {task.title}
                      {task.priority === 'high' && (
                        <span className="text-red-500 text-xs animate-bounce">⚡</span>
                      )}
                    </div>
                    
                    {task.description && (
                      <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {task.description}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge 
                        variant={task.priority === 'high' ? 'destructive' : 
                                task.priority === 'medium' ? 'default' : 'secondary'}
                        className={cn(
                          "text-xs",
                          task.priority === 'high' && "animate-pulse"
                        )}
                      >
                        {task.priority} priority
                      </Badge>
                      
                      <Badge variant="outline" className="text-xs">
                        {task.status}
                      </Badge>
                      
                      {task.dueDate && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    
                    {task.assignedByUser && (
                      <div className="text-xs text-gray-500 mt-1">
                        From: {task.assignedByUser.name}
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
          
          {/* Animated Footer */}
          {tasks.length > 0 && (
            <div className="border-t bg-gradient-to-r from-amber-50 to-orange-50 p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-amber-700 hover:bg-amber-100 font-medium transition-all duration-200 hover:scale-105"
                onClick={() => setLocation('/tasks')}
              >
                <span>View All Tasks</span>
                <span className="ml-2 text-amber-500 animate-bounce">→</span>
              </Button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
  );
}