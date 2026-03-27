import { useState } from "react";
import {
  useListAppointments,
  useListServices,
  useCreateAppointment,
  useUpdateAppointmentStatus,
  useDeleteAppointment,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  format,
  addDays,
  startOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  List,
  CalendarDays,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const aptSchema = z.object({
  clientName: z.string().min(1, "Nome é obrigatório"),
  clientPhone: z.string().optional(),
  serviceId: z.coerce.number().min(1, "Selecione um serviço"),
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Hora é obrigatória"),
  notes: z.string().optional(),
});

type AptForm = z.infer<typeof aptSchema>;

const STATUS_COLORS = [
  "bg-emerald-100 text-emerald-900 border-l-4 border-l-emerald-400",
  "bg-blue-100 text-blue-900 border-l-4 border-l-blue-400",
  "bg-yellow-50 text-yellow-900 border-l-4 border-l-yellow-400",
  "bg-pink-100 text-pink-900 border-l-4 border-l-pink-400",
  "bg-purple-100 text-purple-900 border-l-4 border-l-purple-400",
  "bg-orange-100 text-orange-900 border-l-4 border-l-orange-400",
];

function getCardColor(status: string, index: number) {
  if (status === "cancelled")
    return "bg-red-50 text-red-800 border-l-4 border-l-red-400 opacity-60";
  if (status === "completed")
    return "bg-slate-100 text-slate-700 border-l-4 border-l-slate-400";
  return STATUS_COLORS[index % STATUS_COLORS.length];
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"timeline" | "list">("timeline");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cash" | "card">("pix");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday first
  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const { data: appointments = [], isLoading } = useListAppointments({ startDate, endDate });
  const { data: services = [] } = useListServices();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });

  const createMut = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Agendamento criado! ✨" });
        setIsCreateOpen(false);
        form.reset();
      },
      onError: () => toast({ title: "Erro ao criar agendamento", variant: "destructive" }),
    },
  });

  const statusMut = useUpdateAppointmentStatus({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Status atualizado!" });
        setSelectedApt(null);
      },
    },
  });

  const deleteMut = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Agendamento removido." });
        setSelectedApt(null);
      },
    },
  });

  const form = useForm<AptForm>({
    resolver: zodResolver(aptSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
    },
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // List view: all appointments sorted by date/time
  const sortedAll = [...appointments].sort((a, b) =>
    a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)
  );

  return (
    <div className="flex flex-col h-full gap-0">
      {/* Top title bar */}
      <div className="px-1 pb-5">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie seus agendamentos da semana
        </p>
      </div>

      {/* Toolbar — matches reference image layout */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Left: List / Timeline toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "list"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-4 h-4" />
            Lista
          </button>
          <button
            onClick={() => setView("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === "timeline"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Semana
          </button>
        </div>

        {/* Center: date navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium min-w-[140px] text-center capitalize">
            {format(weekStart, "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 h-8 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: filters + new */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* ── TIMELINE VIEW ── */}
      {view === "timeline" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden flex-1">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {weekDays.map((day, i) => {
              const isToday = format(day, "yyyy-MM-dd") === todayStr;
              return (
                <div
                  key={i}
                  className={`py-3 text-center ${isToday ? "bg-primary/5" : ""}`}
                >
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {format(day, "EEE", { locale: ptBR })}
                  </div>
                  <div
                    className={`text-lg font-bold mt-0.5 ${
                      isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar body */}
          <div className="grid grid-cols-7 divide-x divide-border min-h-[540px]">
            {weekDays.map((day, colIdx) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const isToday = dayStr === todayStr;
              const dayApts = appointments
                .filter((a) => a.date === dayStr)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div
                  key={colIdx}
                  className={`p-2 space-y-1.5 ${isToday ? "bg-primary/[0.02]" : ""}`}
                >
                  {isLoading && (
                    <div className="h-12 bg-muted animate-pulse rounded-lg" />
                  )}
                  {dayApts.map((apt, aptIdx) => (
                    <button
                      key={apt.id}
                      onClick={() => setSelectedApt(apt)}
                      className={`w-full text-left rounded-lg px-2.5 py-2 text-xs cursor-pointer transition-all hover:brightness-95 active:scale-[0.98] ${getCardColor(
                        apt.status,
                        aptIdx
                      )}`}
                    >
                      <div className="font-semibold truncate leading-tight">
                        {apt.clientName}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 opacity-80">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>
                          {apt.startTime} – {apt.endTime}
                        </span>
                      </div>
                    </button>
                  ))}

                  {/* Empty slot hint */}
                  {dayApts.length === 0 && !isLoading && (
                    <button
                      onClick={() => {
                        form.setValue("date", dayStr);
                        setIsCreateOpen(true);
                      }}
                      className="w-full h-10 rounded-lg border border-dashed border-border/60 text-xs text-muted-foreground/50 hover:border-primary/30 hover:text-primary/50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden flex-1">
          {isLoading ? (
            <div className="p-8 flex justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sortedAll.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum agendamento esta semana</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Cliente</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Serviço</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Data</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Horário</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {sortedAll.map((apt, i) => (
                  <tr
                    key={apt.id}
                    onClick={() => setSelectedApt(apt)}
                    className="hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-medium">{apt.clientName}</td>
                    <td className="px-5 py-3 text-muted-foreground">{apt.serviceName}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {format(new Date(apt.date + "T00:00:00"), "dd/MM/yyyy")}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {apt.startTime} – {apt.endTime}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        apt.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                        apt.status === "completed" ? "bg-blue-100 text-blue-700" :
                        apt.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {apt.status === "confirmed" ? "Confirmado" :
                         apt.status === "completed" ? "Concluído" :
                         apt.status === "cancelled" ? "Cancelado" : "Bloqueado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit((d) =>
              createMut.mutate({ data: { ...d, status: "confirmed" } })
            )}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da Cliente *</label>
              <Input
                {...form.register("clientName")}
                placeholder="Ex: Maria Silva"
                className="rounded-lg"
              />
              {form.formState.errors.clientName && (
                <p className="text-xs text-red-500">{form.formState.errors.clientName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefone</label>
              <Input
                {...form.register("clientPhone")}
                placeholder="(11) 99999-9999"
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Serviço *</label>
              <select
                {...form.register("serviceId")}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Selecione o serviço...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — R$ {Number(s.price).toFixed(2).replace(".", ",")}
                  </option>
                ))}
              </select>
              {form.formState.errors.serviceId && (
                <p className="text-xs text-red-500">{form.formState.errors.serviceId.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data *</label>
                <Input
                  type="date"
                  {...form.register("date")}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Hora *</label>
                <Input
                  type="time"
                  {...form.register("startTime")}
                  className="rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações</label>
              <Input
                {...form.register("notes")}
                placeholder="Opcional..."
                className="rounded-lg"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-lg"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending}
                className="flex-1 rounded-lg"
              >
                {createMut.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── APPOINTMENT DETAIL MODAL ── */}
      <Dialog open={!!selectedApt} onOpenChange={(o) => !o && setSelectedApt(null)}>
        <DialogContent className="rounded-2xl max-w-sm p-0 overflow-hidden">
          {selectedApt && (
            <>
              {/* Header strip */}
              <div className={`px-6 pt-6 pb-5 ${
                selectedApt.status === "confirmed" ? "bg-emerald-50 dark:bg-emerald-900/20" :
                selectedApt.status === "completed" ? "bg-blue-50 dark:bg-blue-900/20" :
                selectedApt.status === "cancelled" ? "bg-red-50 dark:bg-red-900/20" :
                "bg-muted"
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {selectedApt.status === "confirmed" ? "✅ Confirmado" :
                       selectedApt.status === "completed" ? "🎉 Concluído" :
                       selectedApt.status === "cancelled" ? "❌ Cancelado" : "🔒 Bloqueado"}
                    </p>
                    <h3 className="text-xl font-bold mt-1">{selectedApt.clientName}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedApt.serviceName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      R$ {Number(selectedApt.servicePrice).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(new Date(selectedApt.date + "T00:00:00"), "dd/MM/yyyy")} •{" "}
                    {selectedApt.startTime} – {selectedApt.endTime}
                  </span>
                </div>
                {selectedApt.clientPhone && (
                  <p className="text-sm text-muted-foreground mt-1">📞 {selectedApt.clientPhone}</p>
                )}
                {selectedApt.notes && (
                  <p className="text-sm text-muted-foreground mt-1 italic">💬 {selectedApt.notes}</p>
                )}
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2">
                {selectedApt.status === "confirmed" && (
                  <>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Forma de pagamento para concluir:
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(["pix", "cash", "card"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                            paymentMethod === m
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border hover:bg-muted"
                          }`}
                        >
                          {m === "pix" ? "💸 Pix" : m === "cash" ? "💵 Dinheiro" : "💳 Cartão"}
                        </button>
                      ))}
                    </div>
                    <Button
                      className="w-full rounded-lg h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() =>
                        statusMut.mutate({
                          id: selectedApt.id,
                          data: { status: "completed", paymentMethod },
                        })
                      }
                      disabled={statusMut.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Marcar como Concluído
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full rounded-lg h-10 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() =>
                        statusMut.mutate({
                          id: selectedApt.id,
                          data: { status: "cancelled" },
                        })
                      }
                      disabled={statusMut.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar Agendamento
                    </Button>
                  </>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg text-red-500 border-red-200 hover:bg-red-50 h-9"
                    onClick={() => {
                      if (confirm("Excluir este agendamento permanentemente?")) {
                        deleteMut.mutate({ id: selectedApt.id });
                      }
                    }}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Excluir
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-lg h-9"
                    onClick={() => setSelectedApt(null)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
