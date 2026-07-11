import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Masuk — Digital Scoreboard Tenis Meja" },
      { name: "description", content: "Login admin dan operator papan skor tenis meja." },
    ],
  }),
  component: LoginPage,
});

type Mode = "login" | "register" | "forgot";

function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Link reset password telah dikirim ke email Anda.");
        setMode("login");
      } else if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Akun dibuat! Periksa email Anda untuk konfirmasi, lalu masuk.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--primary)_15%,transparent),transparent_60%)]" />
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-primary font-display text-xl font-bold text-primary-foreground">
            TT
          </div>
          <CardTitle>
            {mode === "login" ? "Masuk Operator" : mode === "register" ? "Daftar Akun" : "Lupa Password"}
          </CardTitle>
          <CardDescription>
            {mode === "forgot"
              ? "Masukkan email Anda, kami akan mengirim link reset password."
              : "Digital Scoreboard Tenis Meja"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            {mode === "register" && (
              <div className="grid gap-1.5">
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@turnamen.id"
                required
              />
            </div>
            {mode !== "forgot" && (
              <div className="grid gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            )}
            {mode === "login" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  Ingat saya
                </label>
                <button type="button" className="text-primary hover:underline" onClick={() => setMode("forgot")}>
                  Lupa password?
                </button>
              </div>
            )}
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Memproses…" : mode === "login" ? "Masuk" : mode === "register" ? "Daftar" : "Kirim Link Reset"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Belum punya akun?{" "}
                <button className="text-primary hover:underline" onClick={() => setMode("register")}>
                  Daftar
                </button>
              </>
            ) : (
              <button className="text-primary hover:underline" onClick={() => setMode("login")}>
                Kembali ke halaman masuk
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
