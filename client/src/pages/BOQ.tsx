import BOQUpload from "@/components/BOQ/BOQUpload";
import { authService } from "@/lib/auth";
import { useEffect } from "react";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";

export default function BOQ() {
  const user = authService.getUser();

  useEffect(() => {
    if (user && !['admin', 'manager'].includes(user.role)) {
      window.location.href = '/';
    }
  }, [user]);

  if (!user || !['admin', 'manager'].includes(user.role)) {
    return null;
  }

  return <BOQUpload />;
}
