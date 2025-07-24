import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import { 
  Clock, 
  Users, 
  Calendar,
  IndianRupee,
  UserCheck,
  UserX,
  FileText,
  Download,
  Eye,
  Plus,
  CheckCircle,
  XCircle,
  MapPin,
  Timer,
  Calculator,
  CreditCard,
  Edit,
  UserPlus
} from "lucide-react";
// @ts-ignore
import html2pdf from 'html2pdf.js';

// Status options and colors - moved to global scope
const statusOptions = [
  { value: 'present', label: 'Present', icon: '✓' },
  { value: 'absent', label: 'Absent', icon: '✗' },
  { value: 'half_day', label: 'Half Day', icon: '½' },
  { value: 'late', label: 'Late', icon: '⏰' },
  { value: 'on_leave', label: 'On Leave', icon: '🏖️' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'present': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    case 'absent': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
    case 'half_day': return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
    case 'late': return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    case 'on_leave': return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
  }
};

// Monthly Attendance Calendar Component - Mobile Compatible
const MonthlyAttendanceCalendar = ({ 
  staffId, 
  month, 
  year, 
  attendanceData, 
  onUpdate 
}: {
  staffId: number;
  month: number;
  year: number;
  attendanceData: any[];
  onUpdate: (date: string, status: string) => void;
}) => {
  const isMobile = useIsMobile();
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  
  const getAttendanceForDate = (day: number) => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return attendanceData.find(a => {
      const recordDate = new Date(a.date).toISOString().split('T')[0];
      return recordDate === dateStr;
    });
  };



  const handleStatusChange = (day: number, newStatus: string) => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onUpdate(dateStr, newStatus);
  };

  if (isMobile) {
    // Enhanced Mobile Calendar View
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Mobile Status Legend - Horizontal Scrollable */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 border-b">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {statusOptions.map(option => (
              <div 
                key={option.value} 
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(option.value)}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">{option.icon}</span>
                  <span>{option.label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Mini Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-3">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={`weekday-${index}`} className="text-center text-xs font-semibold text-amber-800 py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-10"></div>
            ))}
            
            {/* Calendar days - Mobile optimized */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const attendance = getAttendanceForDate(day);
              const isToday = new Date().getDate() === day && 
                             new Date().getMonth() === month - 1 && 
                             new Date().getFullYear() === year;
              const isSunday = new Date(year, month - 1, day).getDay() === 0;
              
              return (
                <div 
                  key={day}
                  className={`h-10 w-full border rounded-lg flex flex-col items-center justify-center text-xs transition-all duration-200 ${
                    isToday ? 'border-amber-400 bg-amber-100 shadow-md' : 
                    isSunday ? 'bg-red-50 border-red-200' : 
                    attendance?.status ? getStatusColor(attendance.status) :
                    'border-gray-200 bg-gray-50'
                  }`}
                  onClick={() => {}} // Disabled for calendar component
                >
                  <span className={`font-semibold ${isToday ? 'text-amber-900' : isSunday ? 'text-red-700' : 'text-gray-800'}`}>
                    {day}
                  </span>
                  {attendance?.status && (
                    <span className="text-[8px] leading-none">
                      {statusOptions.find(opt => opt.value === attendance.status)?.icon}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Quick Actions Panel */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-amber-800">Quick Actions</h4>
            <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
              Tap days above to mark
            </div>
          </div>
          
          {/* Today's Quick Action */}
          {(() => {
            const today = new Date().getDate();
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            if (currentMonth === month && currentYear === year) {
              const todayAttendance = getAttendanceForDate(today);
              return (
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-sm font-bold text-white">{today}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-amber-900">Today</div>
                        <div className="text-xs text-amber-600">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!todayAttendance?.status ? (
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                          onClick={() => {}} // Disabled for calendar component
                        >
                          ✓ Mark Now
                        </Button>
                      ) : (
                        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(todayAttendance.status)}`}>
                          {statusOptions.find(opt => opt.value === todayAttendance.status)?.icon} {' '}
                          {statusOptions.find(opt => opt.value === todayAttendance.status)?.label}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Bulk Actions */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-shrink-0 text-xs border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => {
                // Bulk mark present for unmarked days
                Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const attendance = getAttendanceForDate(day);
                  if (!attendance?.status) {
                    handleStatusChange(day, 'present');
                  }
                });
              }}
            >
              <span className="mr-1">✓</span>
              All Present
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-shrink-0 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => {
                // Mark all Sundays as off
                Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isSunday = new Date(year, month - 1, day).getDay() === 0;
                  if (isSunday) {
                    handleStatusChange(day, 'on_leave');
                  }
                });
              }}
            >
              <span className="mr-1">🏖️</span>
              Sundays Off
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop calendar view
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div key={`desktop-weekday-${index}`} className="text-center font-medium text-amber-900 p-2 bg-amber-50 rounded">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-4">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={`empty-${i}`} className="h-12"></div>
        ))}
        
        {/* Calendar days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const attendance = getAttendanceForDate(day);
          const isToday = new Date().getDate() === day && 
                         new Date().getMonth() === month - 1 && 
                         new Date().getFullYear() === year;
          const isSunday = new Date(year, month - 1, day).getDay() === 0;
          
          return (
            <div 
              key={day}
              className={`h-12 border rounded p-1 transition-all duration-200 ${
                isToday ? 'border-amber-300 bg-amber-50 shadow-md' : 
                isSunday ? 'bg-red-50 border-red-200' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`font-medium text-xs mb-0.5 ${isToday ? 'text-amber-900' : isSunday ? 'text-red-600' : 'text-gray-800'}`}>
                {day}
                {isToday && <div className="text-[10px] text-amber-600">Now</div>}
                {isSunday && <div className="text-[10px] text-red-500">Sun</div>}
              </div>
              <Select
                value={attendance?.status || ''}
                onValueChange={(value) => handleStatusChange(day, value)}
              >
                <SelectTrigger className={`h-6 text-[10px] border transition-colors ${getStatusColor(attendance?.status || '')}`}>
                  <SelectValue placeholder="Mark" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-1">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      
      {/* Compact Legend */}
      <div className="mt-3 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded border border-amber-200">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {statusOptions.map(option => (
            <div 
              key={option.value} 
              className={`px-2 py-1 rounded border font-medium transition-all duration-200 ${getStatusColor(option.value)}`}
            >
              <span className="flex items-center gap-1">
                <span>{option.icon}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Form schemas
const staffFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  basicSalary: z.number().min(0, "Salary must be positive"),
  aadharNumber: z.string().optional(),
  address: z.string().optional(),
  joiningDate: z.string().optional(),
  bankAccount: z.string().optional(),
  ifscCode: z.string().optional(),
  role: z.enum(["admin", "manager", "storekeeper", "user"]),
});

type StaffFormData = z.infer<typeof staffFormSchema>;

export default function Attendance() {
  const { toast } = useToast();
  const user = authService.getUser();
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Generate year options from 2024 to 2030
  const yearOptions = Array.from({ length: 7 }, (_, i) => 2024 + i);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState<string>("");
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<any[]>([]);
  const [isEditingMonthlyAttendance, setIsEditingMonthlyAttendance] = useState(false);


  // Forms
  const addStaffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      employeeId: "",
      department: "",
      designation: "",
      basicSalary: 0,
      aadharNumber: "",
      address: "",
      joiningDate: "",
      bankAccount: "",
      ifscCode: "",
      role: "user",
    },
  });

  const editStaffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
  });

  // Queries
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ["/api/attendance", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest('GET', `/api/attendance?month=${selectedMonth}&year=${selectedYear}`),
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["/api/attendance/today"],
    queryFn: () => authenticatedApiRequest('GET', "/api/attendance/today"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => authenticatedApiRequest('GET', "/api/users"),
  });

  const { data: payrollRecords = [] } = useQuery({
    queryKey: ["/api/payroll", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest('GET', `/api/payroll?month=${selectedMonth}&year=${selectedYear}`),
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ["/api/attendance/stats", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest('GET', `/api/attendance/stats?month=${selectedMonth}&year=${selectedYear}`),
  });

  // Mutations
  const adminCheckInMutation = useMutation({
    mutationFn: async (data: { userId: number; location?: string; notes?: string }) => {
      return authenticatedApiRequest("POST", "/api/attendance/admin-checkin", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Staff checked in successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-in failed", description: String(error), variant: "destructive" });
    },
  });

  const adminCheckOutMutation = useMutation({
    mutationFn: async (data: { attendanceId: number; notes?: string }) => {
      return authenticatedApiRequest("POST", "/api/attendance/admin-checkout", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Staff checked out successfully" });
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      date: string;
      status: string;
      checkInTime?: string;
      checkOutTime?: string;
      notes?: string;
    }) => {
      return authenticatedApiRequest("POST", "/api/attendance/mark", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Attendance marked successfully" });
    },
  });

  const generatePayrollMutation = useMutation({
    mutationFn: async (data: { userId: number; month: number; year: number }) => {
      return authenticatedApiRequest("POST", "/api/payroll/generate", data);
    },
    onSuccess: () => {
      // Force complete refresh of payroll data with correct query key structure
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll", selectedMonth, selectedYear] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll"] 
      });
      
      // Force immediate refetch with exact same parameters
      queryClient.refetchQueries({ 
        queryKey: ["/api/payroll", selectedMonth, selectedYear]
      });
      
      toast({ title: "Payroll generated successfully" });
    },
  });

  const processPayrollMutation = useMutation({
    mutationFn: async (payrollId: number) => {
      return authenticatedApiRequest("POST", `/api/payroll/${payrollId}/process`);
    },
    onSuccess: () => {
      // Invalidate with specific query parameters to ensure refresh
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll", selectedMonth, selectedYear] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll"] 
      });
      toast({ title: "Payroll processed successfully" });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      return authenticatedApiRequest("POST", "/api/users", { ...data, username: data.email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddStaffOpen(false);
      addStaffForm.reset();
      toast({ title: "Staff member added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<StaffFormData> }) => {
      return authenticatedApiRequest("PATCH", `/api/users/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditStaffOpen(false);
      setEditingStaff(null);
      editStaffForm.reset();
      toast({ title: "Staff member updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkUpdateAttendanceMutation = useMutation({
    mutationFn: async (data: { 
      userId: number; 
      month: number; 
      year: number; 
      attendanceData: any[] 
    }) => {
      return authenticatedApiRequest("POST", "/api/attendance/bulk-update", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      setIsEditingMonthlyAttendance(false);
      toast({ title: "Monthly attendance updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update attendance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Number to words conversion function
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertBelow1000 = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };

    if (num < 1000) {
      return convertBelow1000(num).trim();
    } else if (num < 100000) {
      return (convertBelow1000(Math.floor(num / 1000)) + 'Thousand ' + convertBelow1000(num % 1000)).trim();
    } else {
      return (convertBelow1000(Math.floor(num / 100000)) + 'Lakh ' + convertBelow1000((num % 100000) / 1000) + 'Thousand ' + convertBelow1000(num % 1000)).trim();
    }
  };

  // Pay slip generation function
  const generatePaySlip = (payroll: any, staffMember: any) => {
    const paySlipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pay Slip - ${staffMember.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; }
          .container { width: 210mm; height: 297mm; margin: 0 auto; padding: 20mm; background: white; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #D4B896; padding-bottom: 15px; }
          .logo { height: 60px; margin-bottom: 10px; }
          .company-name { font-size: 24px; font-weight: bold; color: #D4B896; margin-bottom: 5px; }
          .tagline { font-size: 12px; color: #666; letter-spacing: 1px; }
          .pay-slip-title { font-size: 20px; font-weight: bold; color: #333; margin-top: 15px; }
          
          .info-section { border: 2px solid #D4B896; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .info-row:last-child { margin-bottom: 0; }
          .label { font-weight: bold; color: #444; }
          .value { color: #666; }
          
          .earnings-deductions { display: flex; gap: 20px; margin-bottom: 20px; }
          .earnings, .deductions { flex: 1; border: 1px solid #D4B896; border-radius: 8px; }
          .section-header { background: #D4B896; color: white; padding: 10px; text-align: center; font-weight: bold; border-radius: 6px 6px 0 0; }
          .section-content { padding: 15px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; }
          .item:not(:last-child) { border-bottom: 1px dotted #ddd; }
          
          .total-section { background: #f8f9fa; border: 2px solid #D4B896; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #D4B896; }
          
          .attendance-summary { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .attendance-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          
          .footer { text-align: center; font-size: 11px; color: #666; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 40px; }
          .signature-box { text-align: center; width: 200px; }
          .signature-line { border-bottom: 1px solid #333; margin-bottom: 5px; height: 40px; }
          
          @media print {
            .container { margin: 0; padding: 10mm; }
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="/furnili-logo-big.png" alt="Furnili Logo" class="logo" onerror="this.style.display='none'">
            <div class="company-name">FURNILI</div>
            <div class="tagline">BESPOKE MODULAR FURNITURE</div>
            <div class="pay-slip-title">SALARY SLIP</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="label">Employee Name:</span>
              <span class="value">${staffMember.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Employee ID:</span>
              <span class="value">${staffMember.employeeId || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Department:</span>
              <span class="value">${staffMember.department || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Designation:</span>
              <span class="value">${staffMember.designation || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Month/Year:</span>
              <span class="value">${new Date(0, payroll.month - 1).toLocaleString('default', { month: 'long' })} ${payroll.year}</span>
            </div>
            <div class="info-row">
              <span class="label">Pay Date:</span>
              <span class="value">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
          
          <div class="earnings-deductions">
            <div class="earnings">
              <div class="section-header">EARNINGS</div>
              <div class="section-content">
                <div class="item">
                  <span>Basic Salary</span>
                  <span>₹${payroll.basicSalary?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Overtime Pay</span>
                  <span>₹${payroll.overtimePay?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Allowances</span>
                  <span>₹${payroll.allowances?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Bonus</span>
                  <span>₹${payroll.bonus?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item" style="border-top: 2px solid #D4B896; font-weight: bold; color: #D4B896;">
                  <span>Total Earnings</span>
                  <span>₹${((payroll.basicSalary || 0) + (payroll.overtimePay || 0) + (payroll.allowances || 0) + (payroll.bonus || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div class="deductions">
              <div class="section-header" style="background: #dc3545;">DEDUCTIONS</div>
              <div class="section-content">
                <div class="item">
                  <span>Professional Tax</span>
                  <span>₹${(payroll.deductions * 0.1)?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>PF Contribution</span>
                  <span>₹${(payroll.deductions * 0.6)?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>ESI</span>
                  <span>₹${(payroll.deductions * 0.2)?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Other Deductions</span>
                  <span>₹${(payroll.deductions * 0.1)?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item" style="border-top: 2px solid #dc3545; font-weight: bold; color: #dc3545;">
                  <span>Total Deductions</span>
                  <span>₹${payroll.deductions?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="total-section">
            <div class="total-row">
              <span>NET SALARY</span>
              <span>₹${payroll.netSalary?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          
          <div class="attendance-summary">
            <h3 style="margin-bottom: 15px; color: #D4B896; text-align: center;">ATTENDANCE SUMMARY</h3>
            <div class="attendance-grid">
              <div class="item">
                <span class="label">Working Days:</span>
                <span class="value">${payroll.totalWorkingDays || 30}</span>
              </div>
              <div class="item">
                <span class="label">Present Days:</span>
                <span class="value">${payroll.actualWorkingDays || 25}</span>
              </div>
              <div class="item">
                <span class="label">Total Hours:</span>
                <span class="value">${payroll.totalHours?.toFixed(1) || '0.0'} hrs</span>
              </div>
              <div class="item">
                <span class="label">Overtime Hours:</span>
                <span class="value">${payroll.overtimeHours?.toFixed(1) || '0.0'} hrs</span>
              </div>
              <div class="item">
                <span class="label">Leave Days:</span>
                <span class="value">${payroll.leaveDays || 0}</span>
              </div>
              <div class="item">
                <span class="label">Salary in Words:</span>
                <span class="value" style="font-style: italic;">Rupees ${numberToWords(payroll.netSalary || 0)} Only</span>
              </div>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div style="font-weight: bold;">Employee Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div style="font-weight: bold;">HR Manager</div>
            </div>
          </div>
          
          <div class="footer">
            <div>This is a system generated payslip and does not require signature.</div>
            <div style="margin-top: 5px;">Generated by Furnili Management System on ${new Date().toLocaleString()}</div>
            <div style="margin-top: 5px; font-size: 10px;">For queries, contact HR Department</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate PDF with optimized settings for better formatting
    const options = {
      margin: [0.5, 0.3, 0.5, 0.3], // top, right, bottom, left in inches
      filename: `PaySlip_${staffMember.name}_${new Date(0, payroll.month - 1).toLocaleString('default', { month: 'long' })}_${payroll.year}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      }
    };

    html2pdf().set(options).from(paySlipHTML).save();
    
    // Show success toast
    toast({ 
      title: "Pay slip generated", 
      description: `PDF download started for ${staffMember.name}` 
    });
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { variant: "default" as const, icon: CheckCircle, color: "text-green-600" },
      absent: { variant: "destructive" as const, icon: XCircle, color: "text-red-600" },
      half_day: { variant: "secondary" as const, icon: Timer, color: "text-yellow-600" },
      late: { variant: "outline" as const, icon: Clock, color: "text-orange-600" },
      on_leave: { variant: "secondary" as const, icon: Calendar, color: "text-blue-600" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.present;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-";
    return new Date(timeString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleEditStaff = (staffMember: any) => {
    setEditingStaff(staffMember);
    editStaffForm.reset({
      name: staffMember.name || "",
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      employeeId: staffMember.employeeId || "",
      department: staffMember.department || "",
      designation: staffMember.designation || "",
      basicSalary: staffMember.basicSalary || 0,
      aadharNumber: staffMember.aadharNumber || "",
      address: staffMember.address || "",
      joiningDate: staffMember.joiningDate || "",
      bankAccount: staffMember.bankAccount || "",
      ifscCode: staffMember.ifscCode || "",
      role: staffMember.role || "user",
    });
    setIsEditStaffOpen(true);
  };

  const onAddStaffSubmit = (data: StaffFormData) => {
    createStaffMutation.mutate(data);
  };

  const onEditStaffSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, updates: data });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Staff Attendance & Payroll</h1>
          <p className="text-gray-600">Complete staff management system</p>
        </div>
        
        {/* Month/Year Selector */}
        <div className="flex gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {new Date(2024, i).toLocaleString("en-IN", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {todayAttendance.filter((a: any) => a.status === "present").length}
            </div>
            <p className="text-xs text-gray-600">out of {staff.length} staff</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {staff.length - todayAttendance.filter((a: any) => a.status === "present").length}
            </div>
            <p className="text-xs text-gray-600">staff members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Working Days</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {attendanceStats?.workingDays || attendanceStats?.totalDays || 0}
            </div>
            <p className="text-xs text-gray-600">this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sundays/Holidays</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {attendanceStats?.holidays || 0}
            </div>
            <p className="text-xs text-gray-600">this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Timer className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {attendanceStats?.totalHours?.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-gray-600">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="checkin">Check In/Out</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="staff">Staff Management</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Today's Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todayAttendance.length > 0 ? (
                    todayAttendance.map((attendance: any) => (
                      <div key={attendance.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{attendance.user?.name}</p>
                            <p className="text-sm text-gray-600">
                              In: {formatTime(attendance.checkInTime)} 
                              {attendance.checkOutTime && ` | Out: ${formatTime(attendance.checkOutTime)}`}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(attendance.status)}
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No attendance records for today</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => {
                    // Generate payroll for all staff
                    staff.forEach((member: any) => {
                      generatePayrollMutation.mutate({
                        userId: member.id,
                        month: selectedMonth,
                        year: selectedYear,
                      });
                    });
                  }}
                >
                  <Calculator className="w-4 h-4 mr-2" />
                  Generate Monthly Payroll
                </Button>
                
                <Button className="w-full justify-start" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Attendance Report
                </Button>
                
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Pay Slips
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Check In/Out Tab */}
        <TabsContent value="checkin" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Check In/Out Management</CardTitle>
              <p className="text-sm text-gray-600">Manage staff check-in and check-out as admin</p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Today's Status</TableHead>
                    <TableHead>Check In Time</TableHead>
                    <TableHead>Check Out Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member: any) => {
                    const todayRecord = todayAttendance.find((a: any) => a.userId === member.id);
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-gray-600">{member.designation || "Staff"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {todayRecord ? getStatusBadge(todayRecord.status) : (
                            <Badge variant="outline">Not Marked</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatTime(todayRecord?.checkInTime)}</TableCell>
                        <TableCell>{formatTime(todayRecord?.checkOutTime)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {!todayRecord ? (
                              <Button
                                size="sm"
                                onClick={() => adminCheckInMutation.mutate({ userId: member.id })}
                                disabled={adminCheckInMutation.isPending}
                              >
                                Check In
                              </Button>
                            ) : !todayRecord.checkOutTime ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => adminCheckOutMutation.mutate({ attendanceId: todayRecord.id })}
                                disabled={adminCheckOutMutation.isPending}
                              >
                                Check Out
                              </Button>
                            ) : (
                              <span className="text-sm text-gray-500">Completed</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          {user?.role === "admin" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Monthly Attendance Management (Admin Only)
                </CardTitle>
                <p className="text-sm text-gray-600">Edit full month attendance for any staff member</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Label>Staff Member:</Label>
                    <Select 
                      value={selectedStaffForAttendance} 
                      onValueChange={setSelectedStaffForAttendance}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((member: any) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name} - {member.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedStaffForAttendance && (
                    <Button 
                      onClick={() => setIsEditingMonthlyAttendance(true)}
                      variant="outline"
                      className="bg-amber-50 hover:bg-amber-100 border-amber-200"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Monthly Attendance
                    </Button>
                  )}
                </div>

                {selectedStaffForAttendance && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-4 text-amber-900">
                      Attendance Calendar - {staff.find((s: any) => s.id == selectedStaffForAttendance)?.name}
                      <span className="text-sm font-normal text-gray-600 ml-2">
                        ({new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear})
                      </span>
                    </h3>
                    <MonthlyAttendanceCalendar 
                      staffId={parseInt(selectedStaffForAttendance)}
                      month={selectedMonth}
                      year={selectedYear}
                      attendanceData={attendanceRecords.filter((a: any) => a.userId == selectedStaffForAttendance)}
                      onUpdate={(date: string, status: string) => {
                        if (user?.role === "admin") {
                          const attendanceData = [{
                            date,
                            status,
                            userId: parseInt(selectedStaffForAttendance)
                          }];
                          bulkUpdateAttendanceMutation.mutate({
                            userId: parseInt(selectedStaffForAttendance),
                            month: selectedMonth,
                            year: selectedYear,
                            attendanceData
                          });
                        }
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Regular attendance records table */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <p className="text-sm text-gray-600">
                {user?.role === "admin" ? "View all staff attendance records" : "Your attendance history"}
              </p>
            </CardHeader>
            <CardContent>
              {attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {new Date(record.date).toLocaleDateString("en-IN")}
                          </TableCell>
                          <TableCell>{record.user?.name}</TableCell>
                          <TableCell>
                            {record.checkInTime ? 
                              new Date(record.checkInTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit"
                              }) : "-"}
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime ? 
                              new Date(record.checkOutTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit"
                              }) : "-"}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(record.status)}
                          </TableCell>
                          <TableCell>
                            {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 max-w-xs truncate">
                              {record.notes || "-"}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found for the selected period.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Management Tab */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Staff Management
                <Button size="sm" onClick={() => setIsAddStaffOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Details</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Aadhar</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.email}</p>
                            <p className="text-sm text-gray-600">{member.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{member.employeeId || "Not Set"}</TableCell>
                      <TableCell>{member.department || "General"}</TableCell>
                      <TableCell>{formatCurrency(member.basicSalary || 0)}</TableCell>
                      <TableCell>
                        {member.aadharNumber ? (
                          <div>
                            <p className="text-sm">{member.aadharNumber}</p>
                            {member.aadharCardUrl && (
                              <Button size="sm" variant="ghost" className="h-6 px-2">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">Not Provided</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {member.profilePhotoUrl && (
                            <Badge variant="outline">Photo</Badge>
                          )}
                          {member.documentsUrls?.length > 0 && (
                            <Badge variant="outline">{member.documentsUrls.length} Docs</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditStaff(member)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Payroll Management
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      staff.forEach((member: any) => {
                        generatePayrollMutation.mutate({
                          userId: member.id,
                          month: selectedMonth,
                          year: selectedYear,
                        });
                      });
                    }}
                    disabled={generatePayrollMutation.isPending}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Generate All
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Working Days</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member: any) => {
                    const payroll = payrollRecords.find((p: any) => p.userId === member.id);
                    
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-purple-600" />
                            </div>
                            {member.name}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(member.basicSalary || 0)}</TableCell>
                        <TableCell>{payroll?.actualWorkingDays || "-"}</TableCell>
                        <TableCell>{payroll?.totalHours?.toFixed(1) || "0.0"}h</TableCell>
                        <TableCell>{payroll?.overtimeHours?.toFixed(1) || "0.0"}h</TableCell>
                        <TableCell className="font-semibold">
                          {payroll ? formatCurrency(payroll.netSalary) : "-"}
                        </TableCell>
                        <TableCell>
                          {payroll ? (
                            <Badge variant={payroll.status === "paid" ? "default" : "secondary"}>
                              {payroll.status.toUpperCase()}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Generated</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!payroll ? (
                              <Button
                                size="sm"
                                onClick={() => generatePayrollMutation.mutate({
                                  userId: member.id,
                                  month: selectedMonth,
                                  year: selectedYear,
                                })}
                                disabled={generatePayrollMutation.isPending}
                              >
                                Generate
                              </Button>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => generatePaySlip(payroll, member)}
                                >
                                  <FileText className="w-3 h-3 mr-1" />
                                  Pay Slip
                                </Button>
                                {payroll.status !== "paid" && (
                                  <Button
                                    size="sm"
                                    onClick={() => processPayrollMutation.mutate(payroll.id)}
                                    disabled={processPayrollMutation.isPending}
                                  >
                                    <CreditCard className="w-3 h-3 mr-1" />
                                    Process
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Staff Dialog */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New Staff Member
            </DialogTitle>
          </DialogHeader>
          <Form {...addStaffForm}>
            <form onSubmit={addStaffForm.handleSubmit(onAddStaffSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addStaffForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter employee ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter department" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter designation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="basicSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Basic Salary *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter basic salary"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Aadhar number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="joiningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="storekeeper">Storekeeper</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={addStaffForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={addStaffForm.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter bank account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="ifscCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter IFSC code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddStaffOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createStaffMutation.isPending}>
                  {createStaffMutation.isPending ? "Adding..." : "Add Staff Member"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Staff Member
            </DialogTitle>
          </DialogHeader>
          <Form {...editStaffForm}>
            <form onSubmit={editStaffForm.handleSubmit(onEditStaffSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editStaffForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter employee ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter department" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Designation</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter designation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="basicSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Basic Salary *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter basic salary"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Aadhar number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="joiningDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Joining Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="storekeeper">Storekeeper</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editStaffForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter full address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editStaffForm.control}
                  name="bankAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter bank account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="ifscCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter IFSC code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditStaffOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStaffMutation.isPending}>
                  {updateStaffMutation.isPending ? "Updating..." : "Update Staff Member"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>


    </div>
  );
}