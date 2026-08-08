import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, MonitorPlay, PencilLine, Plus, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteBracketCascade } from "@/lib/bracket-sync";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/brackets/")({
  head: () => ({ meta: [{ title: "Bagan Turnamen — Digital Scoreboard Tenis Meja" }] }),
  component: BracketListPage,
});

function BracketListPage() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["brackets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brackets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const remove = async (id: string) => {
    if (!confirm("Hapus bagan ini? Semua peserta dan pertandingan scoreboard yang terhubung akan ikut terhapus.")) return;
    const { error } = await deleteBracketCascade(id);
    if (error) return toast.error(error.message);
    toast.success("Bagan & pertandingan terhubung dihapus");
    void refetch();
  };

  return (
    <AppLayout title="Bagan Turnamen">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Kelola bagan turnamen sistem gugur, preview animasi, dan tampilkan di proyektor.</p>
        <Button asChild>
          <Link to="/brackets/create">
            <Plus className="mr-2 h-4 w-4" /> Buat Bagan
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Memuat…</div>
      ) : !data?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground" />
            <div className="font-display text-lg font-bold">Belum ada bagan</div>
            <p className="text-sm text-muted-foreground">Mulai dengan membuat bagan single elimination pertama Anda.</p>
            <Button asChild>
              <Link to="/brackets/create">
                <Plus className="mr-2 h-4 w-4" /> Buat Bagan
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-display text-lg font-bold uppercase">{b.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{b.category || "Tanpa kategori"}</div>
                  </div>
                  <Badge variant="secondary">{b.participant_count} peserta</Badge>
                </div>
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {b.bracket_type === "single_elimination" ? "Single Elim." : b.bracket_type}
                  </Badge>
                  {b.location && <Badge variant="secondary">{b.location}</Badge>}
                  {b.scheduled_date && <Badge variant="secondary">{b.scheduled_date}</Badge>}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/brackets/$id/edit" params={{ id: b.id }}>
                      <PencilLine className="mr-1 h-3.5 w-3.5" /> Editor
                    </Link>
                  </Button>
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/brackets/$id/preview" params={{ id: b.id }}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/brackets/$id/display" params={{ id: b.id }}>
                      <MonitorPlay className="mr-1 h-3.5 w-3.5" /> Display
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void remove(b.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
