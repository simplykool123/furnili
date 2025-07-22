import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import { Clock, MapPin, CheckCircle, XCircle } from "lucide-react";

export default function Attendance() {
  const { toast } = useToast();
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const { data: attendanceRecords, isLoading } = useQuery({
    queryKey: ["/api/attendance"],
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ["/api/attendance/today"],
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      return authenticatedApiRequest("/api/attendance/checkin", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Check-in successful",
        description: "Welcome! Your attendance has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-in failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return authenticatedApiRequest("/api/attendance/checkout", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Check-out successful",
        description: "Have a great day! Your attendance has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Check-out failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isCheckedIn = todayAttendance && !todayAttendance.checkOutTime;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Staff Attendance</h1>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isCheckedIn ? "Checked In" : "Not Checked In"}
            </div>
            <p className="text-xs text-muted-foreground">
              {todayAttendance?.checkInTime 
                ? `Checked in at ${new Date(todayAttendance.checkInTime).toLocaleTimeString()}`
                : "Click check-in to start your day"
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-center p-6">
            {!isCheckedIn ? (
              <Button
                onClick={() => checkInMutation.mutate()}
                disabled={checkInMutation.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {checkInMutation.isPending ? "Checking in..." : "Check In"}
              </Button>
            ) : (
              <Button
                onClick={() => checkOutMutation.mutate()}
                disabled={checkOutMutation.isPending}
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="mr-2 h-4 w-4" />
                {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceRecords?.filter((record: any) => {
                const recordDate = new Date(record.checkInTime);
                const now = new Date();
                return recordDate.getMonth() === now.getMonth() && 
                       recordDate.getFullYear() === now.getFullYear();
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Days attended this month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceRecords?.reduce((total: number, record: any) => {
                if (record.checkOutTime) {
                  const hours = (new Date(record.checkOutTime).getTime() - new Date(record.checkInTime).getTime()) / (1000 * 60 * 60);
                  return total + hours;
                }
                return total;
              }, 0).toFixed(1) || "0.0"}h
            </div>
            <p className="text-xs text-muted-foreground">
              Total hours worked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours Worked</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords?.map((record: any) => {
                const checkIn = new Date(record.checkInTime);
                const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : null;
                const hoursWorked = checkOut 
                  ? ((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)).toFixed(1)
                  : null;

                return (
                  <TableRow key={record.id}>
                    <TableCell>{checkIn.toLocaleDateString()}</TableCell>
                    <TableCell>{checkIn.toLocaleTimeString()}</TableCell>
                    <TableCell>
                      {checkOut ? checkOut.toLocaleTimeString() : "Not checked out"}
                    </TableCell>
                    <TableCell>
                      {hoursWorked ? `${hoursWorked}h` : "In progress"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={checkOut ? "default" : "secondary"}>
                        {checkOut ? "Complete" : "Active"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}