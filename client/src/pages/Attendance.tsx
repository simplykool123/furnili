import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  CreditCard
} from "lucide-react";

export default function Attendance() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);

  // Queries
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ["/api/attendance", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest(`/api/attendance?month=${selectedMonth}&year=${selectedYear}`),
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["/api/attendance/today"],
    queryFn: () => authenticatedApiRequest("/api/attendance/today"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => authenticatedApiRequest("/api/users"),
  });

  const { data: payrollRecords = [] } = useQuery({
    queryKey: ["/api/payroll", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest(`/api/payroll?month=${selectedMonth}&year=${selectedYear}`),
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ["/api/attendance/stats", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest(`/api/attendance/stats?month=${selectedMonth}&year=${selectedYear}`),
  });

  // Mutations
  const adminCheckInMutation = useMutation({
    mutationFn: async (data: { userId: number; location?: string; notes?: string }) => {
      return authenticatedApiRequest("/api/attendance/admin-checkin", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Staff checked in successfully" });
    },
  });

  const adminCheckOutMutation = useMutation({
    mutationFn: async (data: { attendanceId: number; notes?: string }) => {
      return authenticatedApiRequest("/api/attendance/admin-checkout", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
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
      return authenticatedApiRequest("/api/attendance/mark", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({ title: "Attendance marked successfully" });
    },
  });

  const generatePayrollMutation = useMutation({
    mutationFn: async (data: { userId: number; month: number; year: number }) => {
      return authenticatedApiRequest("/api/payroll/generate", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll generated successfully" });
    },
  });

  const processPayrollMutation = useMutation({
    mutationFn: async (payrollId: number) => {
      return authenticatedApiRequest(`/api/payroll/${payrollId}/process`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll processed successfully" });
    },
  });

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
              {Array.from({ length: 5 }, (_, i) => (
                <SelectItem key={2020 + i} value={(2020 + i).toString()}>
                  {2020 + i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Timer className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {attendanceStats?.totalHours?.toFixed(1) || "0.0"}
            </div>
            <p className="text-xs text-gray-600">this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payroll</CardTitle>
            <IndianRupee className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {payrollRecords.reduce((sum: number, p: any) => sum + p.netSalary, 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-600">total this month</p>
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
                <Button size="sm">
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
                        <Button size="sm" variant="outline">
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
                                <Button size="sm" variant="outline">
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
    </div>
  );
}