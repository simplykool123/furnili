import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Generate year options from 2024 to 2030
  const yearOptions = Array.from({ length: 7 }, (_, i) => 2024 + i);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

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
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll generated successfully" });
    },
  });

  const processPayrollMutation = useMutation({
    mutationFn: async (payrollId: number) => {
      return authenticatedApiRequest("POST", `/api/payroll/${payrollId}/process`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
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
          n = 0;
        }
        if (n > 0) {
          result += ones[n] + ' ';
        }
        return result;
      };
      
      let result = '';
      const crores = Math.floor(num / 10000000);
      const lakhs = Math.floor((num % 10000000) / 100000);
      const thousands = Math.floor((num % 100000) / 1000);
      const remaining = num % 1000;
      
      if (crores > 0) result += convertBelow1000(crores) + 'Crore ';
      if (lakhs > 0) result += convertBelow1000(lakhs) + 'Lakh ';
      if (thousands > 0) result += convertBelow1000(thousands) + 'Thousand ';
      if (remaining > 0) result += convertBelow1000(remaining);
      
      return result.trim();
    };

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
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.date).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>{record.user?.name}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell>{formatTime(record.checkInTime)}</TableCell>
                      <TableCell>{formatTime(record.checkOutTime)}</TableCell>
                      <TableCell>{record.workingHours?.toFixed(1) || "0.0"}h</TableCell>
                      <TableCell>{record.overtimeHours?.toFixed(1) || "0.0"}h</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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