import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useGetSettings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FcGoogle } from "react-icons/fc";

type Tab = "entrar" | "cadastrar";

export default function AuthPage() {
  const { data: settings } = useGetSettings();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("entrar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const studioName = settings?.studioName || "Studio Layse";
  const primaryColor = settings?.primaryColor || "hsl(350 45% 65%)";
  const publicLogo = (settings as any)?.publicLogoUrl || null;

  const appOrigin = window.location.origin + (import.meta.env.BASE_URL || "/");

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: appOrigin + "agendar",
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha incorretos. Tente novamente.");
    } else {
      navigate("/agendar");
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const phone = fd.get("phone") as string;
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone },
        emailRedirectTo: appOrigin + "agendar",
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(
        "Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois faça login."
      );
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
            <div className="w-28 h-28 mx-auto bg-white rounded-full shadow-xl flex items-center justify-center p-2 mb-4 overflow-hidden">
              <img src={publicLogo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto bg-white rounded-full shadow-xl flex items-center justify-center p-1 mb-4 overflow-hidden">
              <img
                src={`${import.meta.env.BASE_URL}images/logo-placeholder.png`}
                alt="Logo"
                className="w-full h-full object-cover scale-125 object-top"
              />
            </div>
          )}
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">{studioName}</h1>
          <p className="text-muted-foreground">Acesse sua conta para agendar</p>
        </div>

        <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
          <div className="flex border-b border-border/50">
            {(["entrar", "cadastrar"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  tab === t
                    ? "text-foreground border-b-2"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={tab === t ? { borderColor: primaryColor } : {}}
              >
                {t === "entrar" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <CardContent className="p-6 sm:p-8">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-2xl border-2 font-medium flex items-center gap-3 mb-6"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <FcGoogle className="w-5 h-5" />
              Continuar com Google
            </Button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                {success}
              </div>
            )}

            {tab === "entrar" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">E-mail</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Senha</label>
                  <Input
                    name="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base shadow-xl shadow-primary/20 mt-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            )}

            {tab === "cadastrar" && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Nome completo</label>
                  <Input
                    name="name"
                    required
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
                    placeholder="(00) 00000-0000"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">E-mail</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Senha</label>
                  <Input
                    name="password"
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Confirmar senha</label>
                  <Input
                    name="confirm"
                    type="password"
                    required
                    placeholder="Repita a senha"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base shadow-xl shadow-primary/20 mt-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
