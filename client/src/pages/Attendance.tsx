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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
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
  EyeOff,
  Plus,
  CheckCircle,
  XCircle,
  MapPin,
  Timer,
  Calculator,
  CreditCard,
  Edit,
  UserPlus,
  Check,
  X,
  Trash2,
  LogIn,
  LogOut
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

// Payroll Edit Form Component
const PayrollEditForm = ({ staff, payroll, onSave }: {
  staff: any;
  payroll: any;
  onSave: (data: any) => void;
}) => {
  const [allowances, setAllowances] = useState(payroll?.allowances || 0);
  const [advance, setAdvance] = useState(payroll?.advance || 0);
  const [bonus, setBonus] = useState(payroll?.bonus || 0);
  
  const basicSalary = payroll?.basicSalary || staff?.basicSalary || 0;
  const actualWorkingDays = payroll?.actualWorkingDays || 0;
  const totalWorkingDays = payroll?.totalWorkingDays || 30;
  
  // Calculate proportionate salary based on working days (0 if no working days)
  const proportionateSalary = actualWorkingDays > 0 ? 
    Math.round((basicSalary / totalWorkingDays) * actualWorkingDays) : 0;
  
  // Net Salary = Proportionate Basic + Allowances + Bonus - Advance
  const netSalary = proportionateSalary + allowances + bonus - advance;

  const handleSave = () => {
    onSave({
      allowances,
      advance,
      bonus,
      // Calculate final net salary to save
      netSalary: proportionateSalary + allowances + bonus - advance
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Basic Salary</Label>
          <div className="text-lg font-semibold text-gray-700">₹{basicSalary.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Proportionate: ₹{proportionateSalary.toLocaleString()} ({actualWorkingDays}/{totalWorkingDays} days)</div>
        </div>
        <div>
          <Label>Net Salary</Label>
          <div className="text-lg font-semibold text-green-600">₹{netSalary.toLocaleString()}</div>
          <div className="text-xs text-gray-500">
            {proportionateSalary.toLocaleString()} + {allowances} + {bonus} - {advance}
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="allowances">Allowances (Bonus, Travel, Incentives)</Label>
          <Input
            id="allowances"
            type="number"
            value={allowances}
            onChange={(e) => setAllowances(parseInt(e.target.value) || 0)}
            placeholder="Enter allowances"
          />
        </div>
        
        <div>
          <Label htmlFor="advance">Advance Deduction</Label>
          <Input
            id="advance"
            type="number"
            value={advance}
            onChange={(e) => setAdvance(parseInt(e.target.value) || 0)}
            placeholder="Enter advance deduction"
          />
        </div>

        <div>
          <Label htmlFor="bonus">Additional Bonus</Label>
          <Input
            id="bonus"
            type="number"
            value={bonus}
            onChange={(e) => setBonus(parseInt(e.target.value) || 0)}
            placeholder="Enter bonus"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          style={{ backgroundColor: 'hsl(28, 100%, 25%)', color: 'white' }}
        >
          Update Payroll
        </Button>
      </div>
    </div>
  );
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
                  onClick={() => {
                    const attendance = getAttendanceForDate(day);
                    const currentStatus = attendance?.status || 'absent';
                    const statusIndex = statusOptions.findIndex(opt => opt.value === currentStatus);
                    const nextStatus = statusOptions[(statusIndex + 1) % statusOptions.length].value;
                    // Optimistic UI update with debouncing
                    setTimeout(() => handleStatusChange(day, nextStatus), 0);
                  }}
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
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
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
  const currentUser = authService.getUser();
  const admin = authService.hasRole(['admin']);
  const isStorekeeper = authService.hasRole(['store_incharge']);
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Generate year options from 2024 to 2030
  const yearOptions = Array.from({ length: 7 }, (_, i) => 2024 + i);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [editingPayroll, setEditingPayroll] = useState<any>(null);

  // Export attendance report function
  const exportAttendanceReport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      console.log('Starting export for month:', selectedMonth, 'year:', selectedYear);
      
      // Fetch staff and attendance data
      const [staffResponse, attendanceResponse] = await Promise.all([
        apiRequest('GET', '/api/users'),
        apiRequest('GET', `/api/attendance?month=${selectedMonth}&year=${selectedYear}`)
      ]);
      
      const staffData = await staffResponse.json();
      const attendanceData = await attendanceResponse.json();
      
      console.log('Staff data:', staffData);
      console.log('Attendance data:', attendanceData);
      
      if (!Array.isArray(staffData) || !Array.isArray(attendanceData)) {
        throw new Error('Invalid data format received from API');
      }
      
      // Calculate attendance summary for each staff member
      const reportData = staffData.map((member: any) => {
        const memberAttendance = attendanceData.filter((att: any) => att.userId === member.id);
        const totalPresent = memberAttendance.filter((att: any) => att.status === 'present').length;
        const totalAbsent = memberAttendance.filter((att: any) => att.status === 'absent').length;
        const totalHalfDay = memberAttendance.filter((att: any) => att.status === 'half-day').length;
        const totalLeave = memberAttendance.filter((att: any) => att.status === 'leave').length;
        
        return {
          'Employee ID': member.employeeId || 'Not Set',
          'Employee Name': member.name,
          'Department': member.department || 'General',
          'Role': member.role,
          'Present Days': totalPresent,
          'Half Days': totalHalfDay,
          'Leave Days': totalLeave,
          'Absent Days': totalAbsent,
          'Total Working Days': totalPresent + totalHalfDay + totalLeave + totalAbsent,
          'Attendance Percentage': totalPresent + totalAbsent + totalHalfDay + totalLeave > 0 
            ? Math.round(((totalPresent + totalHalfDay * 0.5 + totalLeave) / (totalPresent + totalAbsent + totalHalfDay + totalLeave)) * 100) + '%'
            : '0%'
        };
      });
      
      console.log('Report data prepared:', reportData);
      
      // Convert to CSV
      if (reportData.length === 0) {
        toast({
          title: "No Data",
          description: "No staff data found to export.",
          variant: "destructive"
        });
        return;
      }
      
      const headers = Object.keys(reportData[0]);
      const csvContent = [
        headers.join(','),
        ...reportData.map((row: any) => 
          headers.map(header => `"${row[header]}"`).join(',')
        )
      ].join('\n');
      
      console.log('CSV content generated:', csvContent.substring(0, 200) + '...');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_report_${selectedMonth}_${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `Attendance report exported for ${selectedMonth}/${selectedYear}`
      });
      
    } catch (error) {
      console.error('Export failed with error:', error);
      toast({
        title: "Export Failed", 
        description: error instanceof Error ? error.message : "Failed to export attendance report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{staffId: number, day: number} | null>(null);
  const [editingCellStatus, setEditingCellStatus] = useState<string>("");
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState<string>("");
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<any[]>([]);
  const [isEditingMonthlyAttendance, setIsEditingMonthlyAttendance] = useState(false);
  const [showDetailedRecords, setShowDetailedRecords] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");


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

  // Self check-in/out mutations for staff users
  const selfCheckInMutation = useMutation({
    mutationFn: async (data: { location?: string; notes?: string }) => {
      return authenticatedApiRequest("POST", "/api/attendance/checkin", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-in failed", description: String(error), variant: "destructive" });
    },
  });

  const selfCheckOutMutation = useMutation({
    mutationFn: async () => {
      return authenticatedApiRequest("POST", "/api/attendance/checkout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Checked out successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-out failed", description: String(error), variant: "destructive" });
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
      // Generate auto Employee ID if not provided
      let employeeId = data.employeeId;
      if (!employeeId) {
        // Get the highest existing employee ID to determine next number
        const existingIds = staff
          .map((s: any) => s.employeeId)
          .filter((id: string) => id && id.startsWith('FUN-'))
          .map((id: string) => parseInt(id.replace('FUN-', '')))
          .filter((num: number) => !isNaN(num))
          .sort((a: number, b: number) => b - a);
        
        const nextId = existingIds.length > 0 ? existingIds[0] + 1 : 101;
        employeeId = `FUN-${nextId}`;
      }
      
      // Use name as username if email is not provided
      const username = data.email || data.name.toLowerCase().replace(/\s+/g, '');
      
      return authenticatedApiRequest("POST", "/api/users", { 
        ...data, 
        employeeId,
        username
      });
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

  const updatePayrollMutation = useMutation({
    mutationFn: async (data: { payrollId: number; updates: any }) => {
      return authenticatedApiRequest("PATCH", `/api/payroll/${data.payrollId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update payroll",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditPayroll = (payroll: any) => {
    const staffMember = staff?.find((s: any) => s.id === payroll.userId);
    setEditingPayroll({ ...payroll, staff: staffMember });
    setIsEditDialogOpen(true);
  };

  const handlePayrollEdit = (payroll: any) => {
    const staffMember = staff?.find((s: any) => s.id === payroll.userId);
    setEditingPayroll({ ...payroll, staff: staffMember });
    setIsEditDialogOpen(true);
  };

  // Inline attendance editing handlers
  const handleAttendanceEdit = (recordId: number, currentStatus: string) => {
    setEditingAttendance(recordId);
    setEditingStatus(currentStatus);
  };

  const saveAttendanceEdit = async (recordId: number, newStatus: string) => {
    try {
      await authenticatedApiRequest('PATCH', `/api/attendance/${recordId}`, {
        status: newStatus
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] }); // Also refresh payroll
      setEditingAttendance(null);
      setEditingStatus("");
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const cancelAttendanceEdit = () => {
    setEditingAttendance(null);
    setEditingStatus("");
  };

  // Monthly calendar cell editing handlers
  const handleCellEdit = (staffId: number, day: number, currentStatus: string) => {
    setEditingCell({ staffId, day });
    setEditingCellStatus(currentStatus || 'absent');
  };

  const saveCellEdit = async (staffId: number, day: number, newStatus: string) => {
    try {
      // Fix date calculation - use UTC to avoid timezone issues
      const date = new Date(Date.UTC(selectedYear, selectedMonth - 1, day));
      const dateString = date.toISOString().split('T')[0];
      
      console.log('Updating attendance:', { staffId, day, newStatus, dateString });
      
      const response = await authenticatedApiRequest('POST', '/api/attendance/bulk-update', {
        userId: staffId,
        month: selectedMonth,
        year: selectedYear,
        attendanceData: [{
          date: dateString,
          status: newStatus,
          userId: staffId
        }]
      });
      
      console.log('Attendance update response:', response);
      
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] }); // Also refresh payroll
      
      setEditingCell(null);
      setEditingCellStatus("");
      
      toast({
        title: "Attendance Updated",
        description: `Successfully updated attendance for ${new Date(dateString).toLocaleDateString()}`,
      });
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditingCellStatus("");
  };

  const handlePayrollSave = (payrollData: any) => {
    updatePayrollMutation.mutate({
      payrollId: editingPayroll.id,
      updates: payrollData
    });
    setIsEditDialogOpen(false);
    setEditingPayroll(null);
  };

  // Debounced bulk update with optimistic updates
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, any>>(new Map());
  
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
      // Refresh data in background after successful API call
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      }, 300);
      setIsEditingMonthlyAttendance(false);
    },
    onError: (error: any) => {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
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
          .container { width: 210mm; margin: 0 auto; padding: 15mm; background: white; }
          .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #D4B896; padding-bottom: 8px; }
          .logo { height: 40px; margin-bottom: 5px; }
          .company-name { font-size: 18px; font-weight: bold; color: #D4B896; margin-bottom: 3px; }
          .tagline { font-size: 10px; color: #666; letter-spacing: 0.5px; }
          .pay-slip-title { font-size: 14px; font-weight: bold; color: #333; margin-top: 8px; }
          
          .info-section { border: 1px solid #D4B896; border-radius: 4px; padding: 10px; margin-bottom: 10px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
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
          
          .attendance-summary { border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 10px; }
          .attendance-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; }
          
          .footer { text-align: center; font-size: 9px; color: #666; margin-top: 12px; border-top: 1px solid #eee; padding-top: 6px; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 15px; }
          .signature-box { text-align: center; width: 150px; font-size: 10px; }
          .signature-line { border-bottom: 1px solid #333; margin-bottom: 3px; height: 20px; }
          
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
                <div class="item">
                  <span>Incentives</span>
                  <span>₹${((payroll.allowances || 0) * 0.1).toFixed(2)}</span>
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
                  <span>Advance</span>
                  <span>₹${payroll.advance?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Other Deductions</span>
                  <span>₹${((payroll.deductions || 0) * 0.1).toFixed(2)}</span>
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
            <h3 style="margin-bottom: 8px; color: #D4B896; text-align: center; font-size: 12px;">ATTENDANCE SUMMARY</h3>
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

    // Generate PDF with compact settings for single page
    const options = {
      margin: [0.2, 0.2, 0.2, 0.2], // smaller margins in inches
      filename: `PaySlip_${staffMember.name}_${new Date(0, payroll.month - 1).toLocaleString('default', { month: 'long' })}_${payroll.year}.pdf`,
      image: { type: 'jpeg', quality: 0.9 },
      html2canvas: { 
        scale: 1.2, // reduced scale for compactness
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: true,
        height: 1000, // fixed height for single page
        width: 800
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
      present: { variant: "default" as const, icon: CheckCircle, color: "text-green-600", label: "P" },
      absent: { variant: "destructive" as const, icon: XCircle, color: "text-red-600", label: "A" },
      half_day: { variant: "secondary" as const, icon: Timer, color: "text-yellow-600", label: "H" },
      'half-day': { variant: "secondary" as const, icon: Timer, color: "text-yellow-600", label: "H" },
      late: { variant: "outline" as const, icon: Clock, color: "text-orange-600", label: "L" },
      on_leave: { variant: "secondary" as const, icon: Calendar, color: "text-blue-600", label: "LV" },
      'on-leave': { variant: "secondary" as const, icon: Calendar, color: "text-blue-600", label: "LV" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.present;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
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
      joiningDate: staffMember.joiningDate ? new Date(staffMember.joiningDate).toISOString().split('T')[0] : "",
      bankAccount: staffMember.bankAccount || "",
      ifscCode: staffMember.ifscCode || "",
      role: staffMember.role || "user",
    });
    setIsEditStaffOpen(true);
  };

  const handleDeleteStaff = async (staffId: number) => {
    if (confirm("Are you sure you want to deactivate this staff member? They will be marked as inactive but not permanently deleted.")) {
      try {
        await authenticatedApiRequest("DELETE", `/api/users/${staffId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "Staff member deactivated successfully" });
      } catch (error: any) {
        toast({
          title: "Failed to deactivate staff member",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleGenerateAllPayslips = async () => {
    try {
      toast({ title: "Generating payslips for all staff..." });
      for (const staffMember of staff) {
        await generatePayrollMutation.mutateAsync({
          userId: staffMember.id,
          month: selectedMonth,
          year: selectedYear,
        });
      }
      toast({ title: "All payslips generated successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to generate payslips",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProcessAllPayrolls = async () => {
    try {
      toast({ title: "Processing all payrolls..." });
      for (const payroll of payrollRecords) {
        await processPayrollMutation.mutateAsync(payroll.id);
      }
      toast({ title: "All payrolls processed successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to process payrolls",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadPayslip = (payrollId: number) => {
    const payroll = payrollRecords.find((p: any) => p.id === payrollId);
    const staffMember = staff.find((s: any) => s.id === payroll?.userId);
    if (!staffMember || !payroll) return;
    
    // Generate and download payslip HTML content
    const payslipHTML = generatePaySlip(payroll, staffMember);
    
    const opt = {
      margin: 1,
      filename: `payslip_${staffMember.name}_${payroll.month}_${payroll.year}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(payslipHTML).set(opt).save();
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

  // Get current user's today attendance to show check in/out status
  const currentUserAttendance = todayAttendance.find((a: any) => a.userId === currentUser?.id);
  const hasCheckedInToday = currentUserAttendance?.checkInTime;
  const hasCheckedOutToday = currentUserAttendance?.checkOutTime;

  return (
    <FurniliLayout
      title="Staff Attendance & Payroll"
      subtitle="Complete staff management system"
    >
      {/* Header with Month/Year Selector */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Attendance & Payroll</h1>
          <p className="text-sm text-gray-600">Complete staff management system</p>
        </div>
        
        {(admin || isStorekeeper) && (
          <div className="flex gap-2 items-center">
            {/* Quick Check In button for storekeepers */}
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setActiveTab("check-in-out")}
            >
              <Clock className="w-4 h-4 mr-2" />
              Quick Check In
            </Button>
            
            {/* Month/Year Selector */}
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
            
            <Select value={`${selectedMonth}-${selectedYear}`}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="August 2025" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={`${selectedMonth}-${selectedYear}`}>
                  {new Date(selectedYear, selectedMonth - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Dashboard Stats Cards - matching the screenshot layout */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {/* Present Today */}
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <div className="text-xs text-green-700">Present Today</div>
            </div>
            <div className="text-2xl font-bold text-green-800">
              {todayAttendance.filter((a: any) => a.status === "present").length}
            </div>
            <div className="text-xs text-green-600">
              out of {staff.length} staff
            </div>
          </CardContent>
        </Card>

        {/* Absent Today */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-red-600" />
              <div className="text-xs text-red-700">Absent Today</div>
            </div>
            <div className="text-2xl font-bold text-red-800">
              {staff.length - todayAttendance.filter((a: any) => a.status === "present").length}
            </div>
            <div className="text-xs text-red-600">
              staff members
            </div>
          </CardContent>
        </Card>

        {/* Half Day */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-yellow-600" />
              <div className="text-xs text-yellow-700">Half Day</div>
            </div>
            <div className="text-2xl font-bold text-yellow-800">
              {todayAttendance.filter((a: any) => a.status === "half_day").length}
            </div>
            <div className="text-xs text-yellow-600">
              staff members
            </div>
          </CardContent>
        </Card>

        {/* Late Entries */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="text-xs text-orange-700">Late Entries</div>
            </div>
            <div className="text-2xl font-bold text-orange-800">
              {todayAttendance.filter((a: any) => a.status === "late").length}
            </div>
            <div className="text-xs text-orange-600">
              staff members
            </div>
          </CardContent>
        </Card>

        {/* Attendance % */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <div className="text-xs text-blue-700">Attendance %</div>
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {attendanceStats ? `${Math.round((attendanceStats.presentDays / attendanceStats.totalDays) * 100)}%` : '0%'}
            </div>
            <div className="text-xs text-blue-600">
              this month
            </div>
          </CardContent>
        </Card>

        {/* Working Days */}
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div className="text-xs text-purple-700">Working Days</div>
            </div>
            <div className="text-2xl font-bold text-purple-800">
              {attendanceStats?.totalDays || new Date(selectedYear, selectedMonth, 0).getDate()}
            </div>
            <div className="text-xs text-purple-600">
              this month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation - matching the screenshot */}
      <div className="mb-6">
        <nav className="flex space-x-0 border-b border-gray-200 bg-white rounded-t-lg">
          {[
            { id: "dashboard", label: "Dashboard", icon: Calculator },
            { id: "check-in-out", label: "Check In/Out", icon: Clock },
            { id: "attendance", label: "Attendance", icon: Users },
            ...(admin ? [{ id: "staff-management", label: "Staff Management", icon: UserPlus }] : []),
            { id: "payroll", label: "Payroll", icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-amber-600 text-amber-700 bg-amber-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4 inline mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Admin Check In/Out Management */}
          {(admin || isStorekeeper) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Admin Check In/Out Management
                </CardTitle>
                <p className="text-sm text-gray-600">Manage staff check-in and check-out as admin</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
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
                      {staff.slice(0, 10).map((member: any) => {
                        const todayRecord = todayAttendance.find((a: any) => a.userId === member.id);
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm text-gray-500">{member.employeeId || 'No ID'}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {todayRecord ? (
                                <Badge 
                                  variant={todayRecord.status === 'present' ? 'default' : 
                                          todayRecord.status === 'absent' ? 'destructive' :
                                          todayRecord.status === 'half_day' ? 'secondary' : 'outline'}
                                >
                                  {todayRecord.status === 'present' ? 'Present' :
                                   todayRecord.status === 'absent' ? 'Absent' :
                                   todayRecord.status === 'half_day' ? 'Half Day' :
                                   todayRecord.status === 'late' ? 'Late' : 'Unknown'}
                                </Badge>
                              ) : (
                                <Badge variant="outline">Not Marked</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : '-'}
                            </TableCell>
                            <TableCell>
                              {todayRecord?.checkOutTime ? formatTime(todayRecord.checkOutTime) : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!todayRecord?.checkInTime ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => adminCheckInMutation.mutate({ userId: member.id })}
                                    disabled={adminCheckInMutation.isPending}
                                  >
                                    <LogIn className="h-3 w-3 mr-1" />
                                    Check In
                                  </Button>
                                ) : !todayRecord?.checkOutTime ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => adminCheckOutMutation.mutate({ attendanceId: todayRecord.id })}
                                    disabled={adminCheckOutMutation.isPending}
                                  >
                                    <LogOut className="h-3 w-3 mr-1" />
                                    Check Out
                                  </Button>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    <Check className="h-3 w-3 mr-1" />
                                    Complete
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Check In/Out Tab Content */}
      {activeTab === "check-in-out" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Check In/Out Management
            </CardTitle>
            <p className="text-sm text-gray-600">Staff attendance tracking</p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">Check In/Out functionality coming soon</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Tab Content */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              Attendance Records
            </CardTitle>
            <p className="text-sm text-gray-600">Monthly attendance tracking</p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">Attendance records view coming soon</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Management Tab Content - Admin Only */}
      {activeTab === "staff-management" && admin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Staff Management
            </CardTitle>
            <p className="text-sm text-gray-600">Add, edit and manage staff members</p>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-gray-600">Staff management functionality coming soon</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Tab Content */}
      {activeTab === "payroll" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payroll Management
            </CardTitle>
            <p className="text-sm text-gray-600">Salary processing and payslips</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payrollRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Working Days</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRecords.slice(0, 10).map((payroll: any) => {
                        const employee = staff.find((s: any) => s.id === payroll.userId);
                        return (
                          <TableRow key={payroll.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{employee?.name || 'Unknown'}</div>
                                <div className="text-sm text-gray-500">{employee?.employeeId || 'No ID'}</div>
                              </div>
                            </TableCell>
                            <TableCell>₹{payroll.basicSalary?.toLocaleString() || '0'}</TableCell>
                            <TableCell>{payroll.actualWorkingDays || 0}/{payroll.totalWorkingDays || 30}</TableCell>
                            <TableCell className="font-medium">₹{payroll.netSalary?.toLocaleString() || '0'}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={payroll.status === 'paid' ? 'default' : 
                                        payroll.status === 'pending' ? 'secondary' : 'outline'}
                              >
                                {payroll.status || 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => generatePaySlip(payroll, employee)}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  PDF
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No payroll records found for this month</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </FurniliLayout>
  );

}

// Helper function to format time
const formatTime = (timeString: string) => {
  if (!timeString) return '-';
  return new Date(timeString).toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};
