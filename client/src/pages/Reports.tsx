import ReportsView from "@/components/Reports/ReportsView";
import FurniliLayout from "@/components/Layout/FurniliLayout";
import { authService } from "@/lib/auth";
import { useEffect } from "react";

export default function Reports() {
  const user = authService.getUser();

  useEffect(() => {
    if (user && !['admin'].includes(user.role)) {
      window.location.href = '/';
    }
  }, [user]);

  if (!user || !['admin'].includes(user.role)) {
    return null;
  }

  return (
    <FurniliLayout
      title="Reports & Analytics"
      subtitle="Comprehensive reporting and business insights"
    >
      <ReportsView />
    </FurniliLayout>
  );
}
