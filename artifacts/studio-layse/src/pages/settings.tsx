import { useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Paintbrush, MessageSquare, Building2, Globe } from "lucide-react";

export default function SettingsPage() {
  const { data: settings, isLoading } = useGetSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    }
  }, [settings, reset]);

  if (isLoading) return <div>Carregando...</div>;

  const onSubmit = (data: any) => {
    updateMut.mutate({ data });
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
            <CardDescription>Nome do estúdio e cor principal (usada na página de agendamento online).</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Estúdio</label>
              <Input {...register("studioName")} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">Cor Principal (CSS) <Paintbrush className="w-4 h-4" /></label>
              <div className="flex gap-3">
                <Input {...register("primaryColor")} className="rounded-xl flex-1 font-mono text-sm" placeholder="ex: hsl(350 45% 65%) ou #E29578" />
              </div>
              <p className="text-xs text-muted-foreground">Esta cor define o visual do link de agendamento que você manda para as clientes.</p>
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
