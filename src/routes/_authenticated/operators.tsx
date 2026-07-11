import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/operators")({
  head: () => ({ meta: [{ title: "Daftar Operator — Digital Scoreboard Tenis Meja" }] }),
  component: OperatorsPage,
});

function OperatorsPage() {
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppLayout title="Daftar Operator">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.full_name ?? "Tanpa Nama"}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Operator baru dapat mendaftar melalui halaman login. Pengguna pertama otomatis menjadi admin.
      </p>
    </AppLayout>
  );
}
