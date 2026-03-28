import { useState } from "react";
import { useListClients, useGetClient, useCreateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, History, Calendar, Phone, Plus, Mail, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const defaultForm = { name: "", phone: "", email: "" };

function FrequencyBar({ percent, label }: { percent: number; label: string }) {
  const color =
    label === "Alta" ? "bg-emerald-500" :
    label === "Média" ? "bg-amber-400" :
    label === "Baixa" ? "bg-red-400" : "bg-muted-foreground/30";

  const textColor =
    label === "Alta" ? "text-emerald-600" :
    label === "Média" ? "text-amber-600" :
    label === "Baixa" ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className={`text-[11px] font-semibold shrink-0 ${textColor}`}>{label}</span>
    </div>
  );
}

export default function ClientsPage() {
  const { data: clients, isLoading } = useListClients();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [sortBy, setSortBy] = useState<"name" | "frequency" | "visits">("name");

  const filteredClients = clients
    ?.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    )
    .sort((a, b) => {
      const aa = a as any;
      const bb = b as any;
      if (sortBy === "frequency") return (bb.frequencyPercent ?? 0) - (aa.frequencyPercent ?? 0);
      if (sortBy === "visits") return (bb.totalAppointments ?? 0) - (aa.totalAppointments ?? 0);
      return a.name.localeCompare(b.name);
    });

  const createMutation = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast({ title: "Cliente cadastrado com sucesso!" });
        setNewClientOpen(false);
        setForm(defaultForm);
      },
      onError: () => toast({ title: "Erro ao cadastrar cliente", variant: "destructive" }),
    },
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    createMutation.mutate({ data: { name: form.name, phone: form.phone || undefined, email: form.email || undefined } });
  };

  const ClientDetails = ({ id }: { id: number }) => {
    const { data: client } = useGetClient(id);
    const listClient = clients?.find(c => c.id === id) as any;

    if (!client) return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;

    const freq = listClient?.frequencyLabel ?? "—";
    const percent = listClient?.frequencyPercent ?? 0;
    const avgInterval = listClient?.avgIntervalDays;
    const visitsLast30 = listClient?.visitsLast30 ?? 0;
    const visitsLast90 = listClient?.visitsLast90 ?? 0;

    const freqColor =
      freq === "Alta" ? "text-emerald-600 bg-emerald-50" :
      freq === "Média" ? "text-amber-600 bg-amber-50" :
      freq === "Baixa" ? "text-red-500 bg-red-50" : "text-muted-foreground bg-muted";

    const barColor =
      freq === "Alta" ? "bg-emerald-500" :
      freq === "Média" ? "bg-amber-400" :
      freq === "Baixa" ? "bg-red-400" : "bg-muted-foreground/30";

    return (
      <div className="space-y-5 p-4">
        <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl">
          <div className="w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xl">
            {client.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-bold font-serif">{client.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3" /> {client.phone || "Sem telefone"}
            </p>
            {client.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" /> {client.email}
              </p>
            )}
          </div>
        </div>

        {/* Frequency Section */}
        <div className="p-4 bg-muted/20 rounded-2xl border border-border/50 space-y-3">
          <h4 className="font-bold flex items-center gap-2 text-foreground text-sm">
            <TrendingUp className="w-4 h-4 text-primary" /> Frequência de Retorno
          </h4>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${freqColor}`}>{freq}</span>
            <span className="text-sm font-bold text-foreground">{percent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${percent}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="text-center p-2 bg-background rounded-xl border border-border/50">
              <p className="text-lg font-bold text-foreground">{visitsLast30}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">últimos 30 dias</p>
            </div>
            <div className="text-center p-2 bg-background rounded-xl border border-border/50">
              <p className="text-lg font-bold text-foreground">{visitsLast90}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">últimos 90 dias</p>
            </div>
            <div className="text-center p-2 bg-background rounded-xl border border-border/50">
              <p className="text-lg font-bold text-foreground">{avgInterval ? `${avgInterval}d` : "—"}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">intervalo médio</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-bold flex items-center gap-2 mb-3 text-foreground">
            <History className="w-4 h-4 text-primary" /> Histórico de Agendamentos
          </h4>
          {client.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="space-y-3">
              {(client.appointments as any[]).map(apt => (
                <div key={apt.id} className="p-3 bg-muted/30 rounded-xl border border-border/50 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{apt.serviceName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {format(new Date(apt.date + "T12:00:00"), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-background rounded-md shadow-sm">
                    R$ {parseFloat(apt.servicePrice).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Clientes</h1>
          <p className="text-muted-foreground mt-1">Lista de clientes e histórico.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-xl bg-card border-border/50 focus-visible:ring-primary/20 shadow-sm"
              placeholder="Buscar cliente..."
            />
          </div>
          <Button onClick={() => setNewClientOpen(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      {/* Sort tabs */}
      <div className="flex gap-2">
        {(["name", "frequency", "visits"] as const).map(opt => (
          <button
            key={opt}
            onClick={() => setSortBy(opt)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              sortBy === opt
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            {opt === "name" ? "Nome" : opt === "frequency" ? "Frequência" : "Mais visitas"}
          </button>
        ))}
      </div>

      <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
        <div className="grid grid-cols-1 divide-y divide-border">
          {isLoading ? (
            <div className="p-10 text-center">Carregando...</div>
          ) : filteredClients?.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center">
              <Users className="w-12 h-12 mb-3 opacity-20" />
              Nenhum cliente encontrado.
            </div>
          ) : (
            filteredClients?.map(client => {
              const c = client as any;
              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{client.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{client.phone || "Sem contato"}</p>
                      {c.frequencyLabel && c.frequencyLabel !== "Sem visitas" && (
                        <div className="mt-1.5 w-32">
                          <FrequencyBar percent={c.frequencyPercent ?? 0} label={c.frequencyLabel} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{client.totalAppointments} visitas</p>
                    {client.lastAppointment && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Última: {format(new Date((client.lastAppointment as string) + "T12:00:00"), 'dd/MM/yy')}
                      </p>
                    )}
                    {c.frequencyLabel && (
                      <p className={`text-[11px] font-semibold mt-0.5 ${
                        c.frequencyLabel === "Alta" ? "text-emerald-600" :
                        c.frequencyLabel === "Média" ? "text-amber-600" :
                        c.frequencyLabel === "Baixa" ? "text-red-500" : "text-muted-foreground"
                      }`}>{c.frequencyPercent}%</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Detalhes do cliente */}
      <Dialog open={!!selectedClientId} onOpenChange={() => setSelectedClientId(null)}>
        <DialogContent className="rounded-3xl border-border p-0 overflow-hidden sm:max-w-md max-h-[85vh] overflow-y-auto" aria-describedby="client-details-desc">
          <DialogHeader className="p-4 pb-0 bg-primary/5">
            <DialogTitle className="font-serif text-xl">Detalhes da Cliente</DialogTitle>
          </DialogHeader>
          <p id="client-details-desc" className="sr-only">Informações e histórico da cliente</p>
          {selectedClientId && <ClientDetails id={selectedClientId} />}
        </DialogContent>
      </Dialog>

      {/* Cadastro de novo cliente */}
      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md" aria-describedby="new-client-desc">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              Novo Cliente
            </DialogTitle>
          </DialogHeader>
          <p id="new-client-desc" className="sr-only">Formulário para cadastrar novo cliente</p>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input
                placeholder="Ex: Maria Silva"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp / Telefone</Label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="cliente@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="pl-9"
                  type="email"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setNewClientOpen(false); setForm(defaultForm); }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
