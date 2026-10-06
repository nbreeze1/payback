import { createClient } from "@/lib/supabase/server";
import Tracker from "@/components/Tracker";

export default async function Home() {
  const supabase = await createClient();

  const [{ data: charges }, { data: payments }] = await Promise.all([
    supabase.from("charges").select("*").order("charged_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("payments").select("*").order("paid_on", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  return <Tracker charges={charges ?? []} payments={payments ?? []} />;
}
