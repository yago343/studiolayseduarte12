import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import { useGetSettings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

async function saveUserToDb(name: string, phone: string, email: string) {
  try {
    await fetch("/api/public/register-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email }),
    });
  } catch {}
}

export default function CompleteProfilePage() {
  const { data: settings } = useGetSettings();
  const { user, refreshUser } = useAuth();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const primaryColor = settings?.primaryColor || "hsl(350 45% 65%)";
  const publicLogo = (settings as any)?.publicLogoUrl || null;
  const studioName = settings?.studioName || "Studio Layse";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const phone = fd.get("phone") as string;

    const { error } = await supabase.auth.updateUser({
      data: { name, phone },
    });

    if (error) {
      setError("Erro ao salvar dados. Tente novamente.");
    } else {
      if (user?.email) await saveUserToDb(name, phone, user.email);
      await refreshUser();
      navigate("/agendar");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background font-sans relative pb-20">
      <div
        className="absolute top-0 left-0 w-full h-80 bg-cover bg-center z-0 opacity-80"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-bg.png)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
      </div>

      <div className="relative z-10 max-w-md mx-auto pt-16 px-4">
        <div className="text-center mb-10">
          {publicLogo ? (
            <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-xl mb-4 overflow-hidden">
              <img src={publicLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 mx-auto bg-white rounded-full shadow-xl mb-4 overflow-hidden">
              <img
                src={`${import.meta.env.BASE_URL}images/logo-placeholder.png`}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold text-foreground mb-2">{studioName}</h1>
          <p className="text-muted-foreground">Complete seu cadastro para continuar</p>
        </div>

        <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <p className="text-sm text-muted-foreground mb-6 text-center">
              Olá, {user?.email}! Precisamos de mais alguns dados para o seu agendamento.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium pl-1">Nome completo</label>
                <Input
                  name="name"
                  required
                  defaultValue={user?.name || ""}
                  placeholder="Seu nome"
                  className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium pl-1">WhatsApp</label>
                <Input
                  name="phone"
                  type="tel"
                  required
                  defaultValue={user?.phone || ""}
                  placeholder="(00) 00000-0000"
                  className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl text-base shadow-xl shadow-primary/20 mt-2"
                style={{ backgroundColor: primaryColor }}
              >
                {loading ? "Salvando..." : "Continuar para agendamento"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
