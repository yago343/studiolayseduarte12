import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useGetSettings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, KeyRound } from "lucide-react";

type View = "enter-email" | "enter-code" | "first-access";

async function saveUserToDb(name: string, phone: string, email: string) {
  try {
    await fetch("/api/public/register-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email }),
    });
  } catch {}
}

export default function AuthPage() {
  const { data: settings } = useGetSettings();
  const [, navigate] = useLocation();

  const [view, setView] = useState<View>("enter-email");
  const [email, setEmail] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const studioName = settings?.studioName || "Studio Layse";
  const primaryColor = settings?.primaryColor || "hsl(350 45% 65%)";
  const publicLogo = (settings as any)?.publicLogoUrl || null;

  const resetMessages = () => setError("");

  const handleSendCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    const fd = new FormData(e.currentTarget);
    const inputEmail = (fd.get("email") as string).trim().toLowerCase();
    setEmail(inputEmail);

    const { error } = await supabase.auth.signInWithOtp({
      email: inputEmail,
      options: { shouldCreateUser: true },
    });

    if (error) {
      setError("Erro ao enviar o código. Verifique o e-mail e tente novamente.");
      setLoading(false);
      return;
    }

    // Check if user already exists to decide if we need extra info
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setIsNewUser(true);
    }

    setView("enter-code");
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    const fd = new FormData(e.currentTarget);
    const token = (fd.get("code") as string).trim();

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      setError("Código inválido ou expirado. Verifique e tente novamente.");
      setLoading(false);
      return;
    }

    // If user has no name/phone yet, ask for it
    const meta = data?.user?.user_metadata;
    if (!meta?.name || !meta?.phone) {
      setIsNewUser(true);
      setView("first-access");
    } else {
      await saveUserToDb(meta.name, meta.phone, email);
      navigate("/agendar");
    }
    setLoading(false);
  };

  const handleFirstAccess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name") as string;
    const phone = fd.get("phone") as string;

    const { error } = await supabase.auth.updateUser({
      data: { name, phone },
    });

    if (error) {
      setError("Erro ao salvar seus dados. Tente novamente.");
      setLoading(false);
      return;
    }

    await saveUserToDb(name, phone, email);
    navigate("/agendar");
    setLoading(false);
  };

  const logoBlock = (
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
      <h1 className="text-4xl font-serif font-bold text-foreground mb-2">{studioName}</h1>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-sans relative pb-20">
      <div
        className="absolute top-0 left-0 w-full h-80 bg-cover bg-center z-0 opacity-80"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-bg.png)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
      </div>

      <div className="relative z-10 max-w-md mx-auto pt-16 px-4">
        {logoBlock}

        {/* ── STEP 1: Enter email ── */}
        {view === "enter-email" && (
          <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor + "20" }}>
                  <Mail className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold leading-tight">Acesse sua conta</h2>
                  <p className="text-xs text-muted-foreground">Receba um código no seu e-mail para entrar</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Seu e-mail</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-14 rounded-2xl bg-muted/30 border-none px-5 text-base"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base shadow-xl shadow-primary/20"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? "Enviando..." : "Enviar código"}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-5">
                Primeira vez aqui? Só digitar seu e-mail que criamos sua conta automaticamente.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 2: Enter OTP code ── */}
        {view === "enter-code" && (
          <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <button
                onClick={() => { setView("enter-email"); resetMessages(); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor + "20" }}>
                  <KeyRound className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold leading-tight">Digite o código</h2>
                  <p className="text-xs text-muted-foreground">Enviamos 6 dígitos para <span className="font-medium text-foreground">{email}</span></p>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <Input
                  name="code"
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                  className="h-16 rounded-2xl bg-muted/30 border-none px-5 text-3xl text-center tracking-[0.5em] font-mono"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base shadow-xl shadow-primary/20"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? "Verificando..." : "Confirmar e entrar"}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => { setView("enter-email"); resetMessages(); }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
              >
                Não recebi o código — tentar novamente
              </button>
            </CardContent>
          </Card>
        )}

        {/* ── STEP 3: First access — collect name & phone ── */}
        {view === "first-access" && (
          <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-serif font-bold mb-1">Bem-vinda! 🌸</h2>
              <p className="text-sm text-muted-foreground mb-6">
                É sua primeira vez aqui. Preencha seus dados para completar o cadastro.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleFirstAccess} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Nome completo</label>
                  <Input
                    name="name"
                    required
                    autoComplete="name"
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
                    autoComplete="tel"
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
                  {loading ? "Salvando..." : "Concluir e agendar"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
