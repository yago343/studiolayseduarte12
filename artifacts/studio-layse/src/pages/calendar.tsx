import { useState } from "react";
import { useListAppointments, useListServices, useCreateAppointment, useUpdateAppointmentStatus, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const aptSchema = z.object({
  clientName: z.string().min(1, "Nome é obrigatório"),
  clientPhone: z.string().optional(),
  serviceId: z.coerce.number().min(1, "Selecione um serviço"),
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Hora é obrigatória"),
});

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const startDate = format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd');
  const endDate = format(addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), 6), 'yyyy-MM-dd');
  
  const { data: appointments, isLoading } = useListAppointments({ startDate, endDate });
  const { data: services } = useListServices();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMut = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast({ title: "Agendado com sucesso ✨" });
        setIsCreateOpen(false);
        form.reset();
      }
    }
  });

  const statusMut = useUpdateAppointmentStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast({ title: "Status atualizado" });
        setIsStatusOpen(false);
        setSelectedApt(null);
      }
    }
  });

  const form = useForm<z.infer<typeof aptSchema>>({
    resolver: zodResolver(aptSchema),
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd'), startTime: "09:00" }
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    }
  };

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const today = () => setCurrentDate(new Date());

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 0 }), i));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-3xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-serif font-bold capitalize">
            {format(currentDate, "MMMM yyyy", { locale: ptBR })}
          </h1>
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={prevWeek}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" className="rounded-lg h-8 px-3 text-xs font-medium" onClick={today}>Hoje</Button>
            <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8" onClick={nextWeek}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl shadow-md shadow-primary/20 bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Novo Agendamento
        </Button>
      </div>

      <div className="bg-card rounded-3xl border border-border/50 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/50 bg-secondary/30">
          {weekDays.map((day, i) => (
            <div key={i} className={`p-4 text-center ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary/5' : ''}`}>
              <div className="text-xs font-medium text-muted-foreground uppercase">{format(day, 'eee', { locale: ptBR })}</div>
              <div className={`text-xl font-serif mt-1 ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-primary font-bold' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 min-h-[500px] divide-x divide-border/50">
          {weekDays.map((day, i) => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayApts = appointments?.filter(a => a.date === dayStr) || [];
            
            return (
              <div key={i} className={`p-2 space-y-2 ${dayStr === format(new Date(), 'yyyy-MM-dd') ? 'bg-primary/[0.02]' : ''}`}>
                {dayApts.map(apt => (
                  <div 
                    key={apt.id} 
                    onClick={() => { setSelectedApt(apt); setIsStatusOpen(true); }}
                    className={`p-2 rounded-xl text-xs cursor-pointer border hover-elevate transition-transform ${getStatusColor(apt.status)}`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      {apt.startTime}
                      {apt.status === 'confirmed' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                    </div>
                    <div className="truncate mt-0.5 font-medium">{apt.clientName}</div>
                    <div className="truncate opacity-80 mt-0.5">{apt.serviceName}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-3xl p-6 border-border shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-serif">Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(d => createMut.mutate({ data: { ...d, status: 'confirmed' } }))} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Cliente</label>
              <Input {...form.register("clientName")} className="rounded-xl bg-muted/30" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <Input {...form.register("clientPhone")} className="rounded-xl bg-muted/30" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Serviço</label>
              <select {...form.register("serviceId")} className="w-full h-10 px-3 rounded-xl border border-input bg-muted/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Selecione...</option>
                {services?.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data</label>
                <Input type="date" {...form.register("date")} className="rounded-xl bg-muted/30" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Hora</label>
                <Input type="time" {...form.register("startTime")} className="rounded-xl bg-muted/30" />
              </div>
            </div>
            <Button type="submit" disabled={createMut.isPending} className="w-full rounded-xl mt-4">
              {createMut.isPending ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Status Action Modal */}
      <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
        <DialogContent className="rounded-3xl p-0 overflow-hidden border-border max-w-sm">
          {selectedApt && (
            <>
              <div className="bg-secondary/50 p-6 text-center">
                <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-serif text-xl font-bold text-foreground">{selectedApt.clientName}</h3>
                <p className="text-muted-foreground text-sm mt-1">{selectedApt.serviceName}</p>
                <p className="font-medium mt-2 text-foreground">{format(new Date(selectedApt.date), 'dd/MM/yyyy')} às {selectedApt.startTime}</p>
              </div>
              
              <div className="p-6 space-y-3">
                {selectedApt.status !== 'completed' && (
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl h-12 justify-start font-medium text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => {
                      const method = prompt("Método de pagamento (pix, cash, card)?", "pix");
                      if(method && ['pix','cash','card'].includes(method)) {
                        statusMut.mutate({ id: selectedApt.id, data: { status: 'completed', paymentMethod: method as any } });
                      }
                    }}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-3" /> Marcar como Concluído
                  </Button>
                )}
                
                {selectedApt.status !== 'cancelled' && (
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl h-12 justify-start font-medium text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => {
                      if(confirm("Cancelar este agendamento?")) {
                        statusMut.mutate({ id: selectedApt.id, data: { status: 'cancelled' } });
                      }
                    }}
                  >
                    <XCircle className="w-5 h-5 mr-3" /> Cancelar Agendamento
                  </Button>
                )}
                
                <Button variant="ghost" className="w-full rounded-xl" onClick={() => setIsStatusOpen(false)}>Fechar</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
