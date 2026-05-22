import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app/AppLayout";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
