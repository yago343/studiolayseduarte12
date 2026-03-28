import { useEffect, useRef, useState } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { MessageSquare, Building2, Globe, ImageIcon, Upload, X, LayoutDashboard, Globe2 } from "lucide-react";

function LogoUploader({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>

      {value ? (
        <div className="relative group w-fit">
          <img
            src={value}
            alt="Logo"
            className="h-20 max-w-[200px] object-contain rounded-xl border border-border bg-muted/30 p-2"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary w-full"
        >
          <Upload className="w-5 h-5 shrink-0" />
          <span className="text-sm">Clique para escolher imagem</span>
        </button>
      )}

      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg gap-2 text-xs"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" /> Trocar imagem
        </Button>
      )}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useGetSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [adminLogoUrl, setAdminLogoUrl] = useState<string | null>(null);
  const [publicLogoUrl, setPublicLogoUrl] = useState<string | null>(null);

  const updateMut = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Configurações salvas!" });
      }
    }
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      studioName: "",
      primaryColor: "",
      welcomeMessage: "",
      bookingMessage: ""
    }
  });

  useEffect(() => {
    if (settings) {
      reset({
        studioName: settings.studioName,
        primaryColor: settings.primaryColor,
        welcomeMessage: settings.welcomeMessage || "",
        bookingMessage: settings.bookingMessage || ""
      });
      setAdminLogoUrl((settings as any).adminLogoUrl || null);
      setPublicLogoUrl((settings as any).publicLogoUrl || null);
    }
  }, [settings, reset]);

  if (isLoading) return <div>Carregando...</div>;

  const onSubmit = (data: any) => {
    updateMut.mutate({ data: { ...data, adminLogoUrl, publicLogoUrl } });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Personalize a identidade e mensagens do seu estúdio.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
            <CardTitle className="font-serif flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Identidade Visual</CardTitle>
            <CardDescription>Nome, cor principal e logos do estúdio.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Estúdio</label>
              <Input {...register("studioName")} className="rounded-xl" />
            </div>
            {/* Logo Section */}
            <div className="border-t border-border/50 pt-5 space-y-6">
              <div className="flex items-center gap-2 text-foreground">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Logos</span>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Painel Admin
                  </div>
                  <LogoUploader
                    label="Logo do painel"
                    description="Aparece na barra lateral e no cabeçalho do app de gestão."
                    value={adminLogoUrl}
                    onChange={setAdminLogoUrl}
                  />
                </div>

                <div className="p-4 rounded-2xl bg-muted/20 border border-border/50 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Globe2 className="w-3.5 h-3.5" /> Página Pública
                  </div>
                  <LogoUploader
                    label="Logo da página de agendamento"
                    description="Aparece no topo da página de agendamento online para as clientes."
                    value={publicLogoUrl}
                    onChange={setPublicLogoUrl}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
          <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
            <CardTitle className="font-serif flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Mensagens</CardTitle>
            <CardDescription>Textos exibidos para as clientes no app público.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensagem de Boas-vindas (Dashboard Cliente)</label>
              <Textarea {...register("welcomeMessage")} className="rounded-xl resize-none h-20" placeholder="Olá! Bem-vinda ao nosso estúdio..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instruções de Agendamento</label>
              <Textarea {...register("bookingMessage")} className="rounded-xl resize-none h-20" placeholder="Escolha o melhor dia e horário para você..." />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm border-border overflow-hidden bg-gradient-to-r from-primary/10 to-transparent">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold flex items-center gap-2"><Globe className="w-5 h-5" /> Link de Agendamento Público</h3>
              <p className="text-sm text-muted-foreground mt-1">Mande este link para suas clientes agendarem sozinhas.</p>
            </div>
            <Button type="button" variant="outline" className="rounded-xl bg-background shadow-sm" onClick={() => {
              const url = `${window.location.origin}/agendar`;
              navigator.clipboard.writeText(url);
              toast({ title: "Link copiado!" });
            }}>
              Copiar Link
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateMut.isPending} className="rounded-xl h-12 px-8 text-lg bg-primary text-primary-foreground shadow-xl shadow-primary/20">
            {updateMut.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
