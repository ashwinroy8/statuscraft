import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex h-screen bg-[#0d0d0f] overflow-hidden">
      <Sidebar userEmail={user.email ?? undefined} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
