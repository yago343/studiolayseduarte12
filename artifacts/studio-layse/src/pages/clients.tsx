import { useState } from "react";
import { useListClients, useGetClient, useCreateClient, getListClientsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, History, Calendar, Phone, Plus, Mail } from "lucide-react";
import { format } from "date-fns";

const defaultForm = { name: "", phone: "", email: "" };

export default function ClientsPage() {
  const { data: clients, isLoading } = useListClients();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const filteredClients = clients?.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

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
    if (!client) return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;

    return (
      <div className="space-y-6 p-4">
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

        <div>
          <h4 className="font-bold flex items-center gap-2 mb-3 text-foreground">
            <History className="w-4 h-4 text-primary" /> Histórico de Agendamentos
          </h4>
          {client.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="space-y-3">
              {client.appointments.map(apt => (
                <div key={apt.id} className="p-3 bg-muted/30 rounded-xl border border-border/50 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{apt.serviceName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {format(new Date(apt.date), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-background rounded-md shadow-sm">
                    R$ {apt.servicePrice}
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
            filteredClients?.map(client => (
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
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{client.totalAppointments} visitas</p>
                  {client.lastAppointment && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Última: {format(new Date(client.lastAppointment), 'dd/MM/yy')}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Detalhes do cliente */}
      <Dialog open={!!selectedClientId} onOpenChange={() => setSelectedClientId(null)}>
        <DialogContent className="rounded-3xl border-border p-0 overflow-hidden sm:max-w-md" aria-describedby="client-details-desc">
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
