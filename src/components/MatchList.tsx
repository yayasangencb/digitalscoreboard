import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Copy, Gamepad2, MonitorPlay, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/MatchDialogs";
import { MATCH_STATUS_LABEL, statusVariant, type MatchRow } from "@/lib/match-logic";

export type MatchWithTournament = MatchRow & { tournaments: { tournament_name: string } | null };

export function MatchList({
  matches,
  onChanged,
  emptyText = "Belum ada pertandingan.",
}: {
  matches: MatchWithTournament[];
  onChanged: () => void;
  emptyText?: string;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Kode pertandingan disalin");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("matches").delete().eq("id", deleteId);
    if (error) toast.error("Gagal menghapus: " + error.message);
    else {
      toast.success("Pertandingan dihapus");
      onChanged();
    }
    setDeleteId(null);
  };

  if (matches.length === 0) {
    return <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="grid gap-3">
      {matches.map((m) => (
        <Card key={m.id}>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-display font-semibold uppercase">
                  {m.tournaments?.tournament_name ?? "Pertandingan"}
                </span>
                <Badge variant={statusVariant(m.match_status)}>{MATCH_STATUS_LABEL[m.match_status]}</Badge>
                {m.round_name && <Badge variant="outline">{m.round_name}</Badge>}
                {m.table_number && <Badge variant="outline">Meja {m.table_number}</Badge>}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium">{m.player_left_name}</span>
                <span className="font-display text-base font-bold tabular-nums text-primary">
                  {m.sets_left} ({m.score_left}) : ({m.score_right}) {m.sets_right}
                </span>
                <span className="font-medium">{m.player_right_name}</span>
              </div>
              <button
                onClick={() => copyCode(m.match_code)}
                className="mt-1.5 inline-flex items-center gap-1 font-display text-xs font-semibold tracking-widest text-muted-foreground hover:text-foreground"
              >
                {m.match_code} <Copy className="h-3 w-3" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => navigate({ to: "/controller/$matchCode", params: { matchCode: m.match_code } })}
              >
                <Gamepad2 className="h-4 w-4" /> Controller
              </Button>
              <Button size="sm" variant="accent" asChild>
                <Link to="/display/$matchCode" params={{ matchCode: m.match_code }} target="_blank">
                  <MonitorPlay className="h-4 w-4" /> Display
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/matches/$id/edit" params={{ id: m.id }}>
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Hapus Pertandingan?"
        description="Pertandingan beserta seluruh riwayat set dan log skornya akan dihapus permanen."
        confirmLabel="Ya, Hapus"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
