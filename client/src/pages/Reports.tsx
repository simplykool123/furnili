import ReportsView from "@/components/Reports/ReportsView";
import { authService } from "@/lib/auth";
import { useEffect } from "react";

export default function Reports() {
  const user = authService.getUser();

  useEffect(() => {
    if (user && !['admin', 'manager', 'storekeeper'].includes(user.role)) {
      window.location.href = '/';
    }
  }, [user]);

  if (!user || !['admin', 'manager', 'storekeeper'].includes(user.role)) {
    return null;
  }

  return <ReportsView />;
}
