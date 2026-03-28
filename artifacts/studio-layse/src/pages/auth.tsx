import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useGetSettings } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";

type Tab = "entrar" | "cadastrar";
type View = "auth" | "forgot" | "verify-otp" | "new-password";

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

  const [tab, setTab] = useState<Tab>("entrar");
  const [view, setView] = useState<View>("auth");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");

  const studioName = settings?.studioName || "Studio Layse";
  const primaryColor = settings?.primaryColor || "hsl(350 45% 65%)";
  const publicLogo = (settings as any)?.publicLogoUrl || null;

  const resetMessages = () => { setError(""); setSuccess(""); };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
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
    resetMessages();
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
      options: { data: { name, phone } },
    });

    if (error) {
      setError(error.message);
    } else {
      await saveUserToDb(name, phone, email);
      setSuccess(
        "Cadastro realizado! Verifique seu e-mail para confirmar a conta e depois faça login."
      );
    }
    setLoading(false);
  };

  const handleForgotSend = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    setForgotEmail(email);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      setError("Não encontramos esse e-mail. Verifique e tente novamente.");
    } else {
      setView("verify-otp");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    const fd = new FormData(e.currentTarget);
    const token = fd.get("code") as string;

    const { error } = await supabase.auth.verifyOtp({
      email: forgotEmail,
      token,
      type: "email",
    });

    if (error) {
      setError("Código inválido ou expirado. Tente novamente.");
    } else {
      setView("new-password");
    }
    setLoading(false);
  };

  const handleNewPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    resetMessages();
    const fd = new FormData(e.currentTarget);
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

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("Erro ao redefinir senha. Tente novamente.");
    } else {
      navigate("/agendar");
    }
    setLoading(false);
  };

  const logoBlock = (
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

        {/* ── FORGOT PASSWORD: enter email ── */}
        {view === "forgot" && (
          <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <button
                onClick={() => { setView("auth"); resetMessages(); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-xl font-serif font-bold mb-1">Esqueci minha senha</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Digite seu e-mail e enviaremos um código de verificação.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleForgotSend} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">E-mail cadastrado</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
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
            </CardContent>
          </Card>
        )}

        {/* ── VERIFY OTP: enter 6-digit code ── */}
        {view === "verify-otp" && (
          <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <button
                onClick={() => { setView("forgot"); resetMessages(); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
              <h2 className="text-xl font-serif font-bold mb-1">Digite o código</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enviamos um código de 6 dígitos para <span className="font-medium text-foreground">{forgotEmail}</span>.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Código de verificação</label>
                  <Input
                    name="code"
                    type="text"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    className="h-14 rounded-2xl bg-muted/30 border-none px-5 text-2xl text-center tracking-[0.4em] font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base shadow-xl shadow-primary/20"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? "Verificando..." : "Verificar código"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setView("forgot"); resetMessages(); }}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Não recebi o código — reenviar
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── NEW PASSWORD ── */}
        {view === "new-password" && (
          <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-xl font-serif font-bold mb-1">Nova senha</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Código verificado! Escolha uma nova senha para sua conta.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}

              <form onSubmit={handleNewPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Nova senha</label>
                  <Input
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium pl-1">Confirmar nova senha</label>
                  <Input
                    name="confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-base shadow-xl shadow-primary/20"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── MAIN AUTH (login / register) ── */}
        {view === "auth" && (
          <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
            <div className="flex border-b border-border/50">
              {(["entrar", "cadastrar"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); resetMessages(); }}
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
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{success}</div>
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
                      autoComplete="email"
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
                      autoComplete="current-password"
                      className="h-12 rounded-2xl bg-muted/30 border-none px-5"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setView("forgot"); resetMessages(); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl text-base shadow-xl shadow-primary/20"
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
                      autoComplete="name"
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
                      autoComplete="tel"
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
                      autoComplete="email"
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
                      autoComplete="new-password"
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
                      autoComplete="new-password"
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
        )}
      </div>
    </div>
  );
}
