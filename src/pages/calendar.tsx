import { useState, useRef, useEffect, useMemo } from "react";
import { useSearch } from "wouter";
import {
  useListAppointments,
  useListServices,
  useListClients,
  useCreateAppointment,
  useUpdateAppointmentStatus,
  useDeleteAppointment,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  startOfWeek,
  getDay,
  isSameDay,
  isSameMonth,
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
  Trash2,
  CalendarDays,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useIsMobile } from "@/hooks/use-mobile";

/* ─── Constants ─────────────────────────────────────────────── */
const DAY_START = 8;
const DAY_END = 20;
const TOTAL_HOURS = DAY_END - DAY_START;
const HOURS = Array.from({ length: TOTAL_HOURS }, (_, i) => DAY_START + i);

const APT_COLORS = [
  "bg-sky-100 text-sky-900 border-sky-200",
  "bg-violet-100 text-violet-900 border-violet-200",
  "bg-rose-100 text-rose-900 border-rose-200",
  "bg-amber-100 text-amber-900 border-amber-200",
  "bg-teal-100 text-teal-900 border-teal-200",
  "bg-emerald-100 text-emerald-900 border-emerald-200",
];

const APT_LEFT_COLORS = ["bg-sky-400", "bg-violet-400", "bg-rose-400", "bg-amber-400", "bg-teal-400", "bg-emerald-400"];

function aptColor(status: string, idx: number) {
  if (status === "cancelled") return "bg-red-50 text-red-400 border-red-100 opacity-60";
  if (status === "completed") return "bg-slate-100 text-slate-500 border-slate-200";
  return APT_COLORS[idx % APT_COLORS.length];
}

function aptLeftColor(status: string, idx: number) {
  if (status === "cancelled") return "bg-red-300";
  if (status === "completed") return "bg-slate-300";
  return APT_LEFT_COLORS[idx % APT_LEFT_COLORS.length];
}

function timeToMins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/* ─── Schema ─────────────────────────────────────────────────── */
const aptSchema = z.object({
  clientName: z.string().min(1, "Nome é obrigatório"),
  clientPhone: z.string().optional(),
  serviceId: z.coerce.number().min(1, "Selecione um serviço"),
  date: z.string().min(1),
  startTime: z.string().min(1),
  notes: z.string().optional(),
});
type AptForm = z.infer<typeof aptSchema>;

/* ─── Mini Calendar Component ────────────────────────────────── */
function MiniCalendar({
  selected,
  onChange,
  appointmentDates,
}: {
  selected: Date;
  onChange: (d: Date) => void;
  appointmentDates: Set<string>;
}) {
  const [viewMonth, setViewMonth] = useState(new Date(selected));
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const weekDays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const startPad = (getDay(monthStart) + 6) % 7;
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const allCells: (Date | null)[] = [...Array(startPad).fill(null), ...days];
  while (allCells.length % 7 !== 0) allCells.push(null);
  const rows = allCells.length / 7;

  const goToPrevMonth = () => setViewMonth(m => subMonths(m, 1));
  const goToNextMonth = () => setViewMonth(m => addMonths(m, 1));

  function DayCell({ day }: { day: Date | null }) {
    if (!day) return <div className="h-9" />;
    const dStr = format(day, "yyyy-MM-dd");
    const isSelected = isSameDay(day, selected);
    const isToday = dStr === todayStr;
    const hasApts = appointmentDates.has(dStr);
    const isCurrentMonth = isSameMonth(day, viewMonth);

    return (
      <button
        onClick={() => { onChange(day); setViewMonth(day); }}
        className={`relative flex flex-col items-center justify-center h-9 w-full rounded-xl text-sm font-medium transition-all duration-150 ${
          isSelected
            ? "bg-primary text-white shadow-md shadow-primary/30 scale-105"
            : isToday
            ? "bg-primary/10 text-primary font-bold ring-1 ring-primary/30"
            : isCurrentMonth
            ? "hover:bg-muted text-foreground"
            : "text-muted-foreground/30 cursor-default"
        }`}
      >
        {format(day, "d")}
        {hasApts && (
          <span
            className={`absolute bottom-1 w-1 h-1 rounded-full transition-all ${
              isSelected ? "bg-white/70" : "bg-primary"
            }`}
          />
        )}
      </button>
    );
  }

  return (
    <div className="w-full select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onChange(today)}
          className="flex items-center gap-1.5 text-sm font-semibold capitalize text-foreground hover:text-primary transition-colors"
        >
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          {format(viewMonth, "MMMM yyyy", { locale: ptBR })}
        </button>

        <button
          onClick={goToNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: rows }, (_, r) =>
          allCells.slice(r * 7, r * 7 + 7).map((day, i) => (
            <DayCell key={`${r}-${i}`} day={day} />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function CalendarPage() {
  const search = useSearch();
  const initialDate = useMemo(() => {
    const params = new URLSearchParams(search);
    const d = params.get("date");
    if (d) {
      const [y, m, day] = d.split("-").map(Number);
      return new Date(y, m - 1, day);
    }
    return new Date();
  }, []);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cash" | "card">("pix");
  const [isPendingPayment, setIsPendingPayment] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const HOUR_PX = isMobile ? 52 : 72;
  const MIN_PX = HOUR_PX / 60;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const selectedStr = format(currentDate, "yyyy-MM-dd");

  const rangeStart = format(startOfMonth(subMonths(currentDate, 1)), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(addMonths(currentDate, 1)), "yyyy-MM-dd");

  const { data: appointments = [] } = useListAppointments({ startDate: rangeStart, endDate: rangeEnd });
  const { data: services = [] } = useListServices();
  const { data: clients = [] } = useListClients();
  const [clientSearch, setClientSearch] = useState("");
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });

  const createMut = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Agendamento criado! ✨" });
        setIsCreateOpen(false);
        setClientSearch("");
        form.reset();
      },
      onError: () => toast({ title: "Erro ao criar agendamento", variant: "destructive" }),
    },
  });
  const statusMut = useUpdateAppointmentStatus({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "Status atualizado!" }); setSelectedApt(null); } },
  });
  const deleteMut = useDeleteAppointment({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "Agendamento removido." }); setSelectedApt(null); } },
  });

  const form = useForm<AptForm>({
    resolver: zodResolver(aptSchema),
    defaultValues: { date: selectedStr, startTime: "09:00" },
  });

  useEffect(() => {
    form.setValue("date", format(currentDate, "yyyy-MM-dd"));
  }, [currentDate]);

  useEffect(() => {
    if (gridRef.current) {
      const now = new Date();
      const scrollHour = Math.max(0, now.getHours() - 1);
      gridRef.current.scrollTop = scrollHour * HOUR_PX;
    }
  }, []);

  const aptsForDay = (dateStr: string) =>
    appointments.filter(a => a.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const appointmentDates = new Set(appointments.map(a => a.date));
  const todayApts = aptsForDay(selectedStr);

  const isToday = selectedStr === todayStr;
  const dayLabel = isToday ? "Hoje" : format(currentDate, "EEEE", { locale: ptBR });
  const dateLabel = format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  /* ─── Appointment block ───────────────────────────────────────── */
  function AptBlock({ apt, idx }: { apt: any; idx: number }) {
    const startMins = timeToMins(apt.startTime);
    const endMins = timeToMins(apt.endTime);
    const top = (startMins - DAY_START * 60) * MIN_PX;
    const height = Math.max((endMins - startMins) * MIN_PX, 32);
    return (
      <button
        onClick={() => setSelectedApt(apt)}
        style={{ top, height, position: "absolute", left: 4, right: 4 }}
        className={`rounded-xl text-left text-xs border overflow-hidden hover:brightness-95 active:scale-[0.98] transition-all flex shadow-sm ${aptColor(apt.status, idx)}`}
      >
        <div className={`w-1 h-full shrink-0 rounded-l-xl ${aptLeftColor(apt.status, idx)}`} />
        <div className="flex flex-col justify-start gap-0.5 px-2 py-1.5 min-w-0">
          <div className="font-bold truncate leading-tight text-[11px]">{apt.clientName || apt.serviceName}</div>
          {height >= 38 && (
            <div className="truncate text-[10px] opacity-75 leading-none">{apt.serviceName}</div>
          )}
          {height >= 52 && (
            <div className="flex items-center gap-0.5 opacity-60 leading-none mt-0.5">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              <span className="text-[10px]">{apt.startTime} – {apt.endTime}</span>
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-x-hidden gap-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(d => subDays(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className={`text-xl font-bold leading-tight capitalize ${isToday ? "text-primary" : "text-foreground"}`}>
              {dayLabel}
            </h1>
            <p className="text-xs text-muted-foreground font-normal">
              {dateLabel}
            </p>
          </div>
          <button
            onClick={() => setCurrentDate(d => addDays(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 h-8 rounded-xl border border-primary/30 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              Hoje
            </button>
          )}
          <button
            onClick={() => { form.setValue("date", selectedStr); setIsCreateOpen(true); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 hover:brightness-105 transition-all"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mini Calendar ── */}
      <div className="bg-card border border-border rounded-2xl px-4 pt-4 pb-3 shadow-sm">
        <MiniCalendar
          selected={currentDate}
          onChange={setCurrentDate}
          appointmentDates={appointmentDates}
        />
      </div>

      {/* ── Day summary ── */}
      {todayApts.length > 0 ? (
        <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            {todayApts.length} agendamento{todayApts.length > 1 ? "s" : ""} neste dia
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {todayApts.map((apt, i) => (
              <button
                key={apt.id}
                onClick={() => setSelectedApt(apt)}
                className={`shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-xl border ${aptColor(apt.status, i)} transition-all hover:brightness-95`}
              >
                <Clock className="w-3 h-3 shrink-0" />
                <span className="font-bold">{apt.startTime}</span>
                <span className="opacity-70">·</span>
                <span className="max-w-[80px] truncate">{apt.clientName || apt.serviceName}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-muted/40 border border-dashed border-border rounded-2xl px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">Nenhum agendamento neste dia</p>
        </div>
      )}

      {/* ── Time Grid ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex-1 min-h-0 flex flex-col">
        <div ref={gridRef} className="overflow-y-auto flex-1 min-h-0">
          <div style={{ height: TOTAL_HOURS * HOUR_PX, position: "relative" }} className="flex">
            {/* Time labels */}
            <div className="w-14 shrink-0 relative select-none bg-card/50">
              {HOURS.map((h, i) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative">
                  <span className={`absolute left-0 text-[10px] text-muted-foreground/50 font-medium w-full text-right pr-3 ${i === 0 ? "top-1" : "-top-2.5"}`}>
                    {String(h).padStart(2, "0")}h
                  </span>
                </div>
              ))}
              <div className="relative h-0">
                <span className="absolute -top-2.5 left-0 text-[10px] text-muted-foreground/50 font-medium w-full text-right pr-3">
                  20h
                </span>
              </div>
            </div>

            {/* Grid column */}
            <div className="flex-1 relative border-l border-border/30">
              {HOURS.map((h, i) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative border-b border-border/20">
                  {/* Half-hour line */}
                  <div className="absolute left-0 right-0 border-b border-dashed border-border/15" style={{ top: HOUR_PX / 2 }} />
                </div>
              ))}

              {/* Appointment blocks */}
              {todayApts.map((apt, i) => (
                <AptBlock key={apt.id} apt={apt} idx={i} />
              ))}

              {/* Current time line */}
              {selectedStr === todayStr && (() => {
                const now = new Date();
                const mins = now.getHours() * 60 + now.getMinutes();
                const top = (mins - DAY_START * 60) * MIN_PX;
                return (
                  <div style={{ top, position: "absolute", left: 0, right: 0 }} className="flex items-center z-10 pointer-events-none">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-md shadow-primary/40 shrink-0 -ml-1.5" />
                    <div className="flex-1 h-0.5 bg-primary shadow-sm" />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      <Dialog open={isCreateOpen} onOpenChange={v => { setIsCreateOpen(v); if (!v) { setClientSearch(""); setShowClientSuggestions(false); } }}>
        <DialogContent className="rounded-2xl w-[90vw] max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(d => createMut.mutate({ data: { ...d, status: "confirmed" } }))}
            className="space-y-3 pt-1"
          >
            <div className="space-y-1">
              <label className="text-xs font-medium">Nome da Cliente *</label>
              <div className="relative">
                <Input
                  value={clientSearch}
                  onChange={e => {
                    setClientSearch(e.target.value);
                    form.setValue("clientName", e.target.value);
                    setShowClientSuggestions(true);
                  }}
                  onFocus={() => setShowClientSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowClientSuggestions(false), 150)}
                  placeholder="Ex: Maria Silva"
                  className="rounded-xl h-10 text-sm"
                  autoComplete="off"
                />
                {showClientSuggestions && clients.filter(c =>
                  clientSearch.length === 0 || c.name.toLowerCase().includes(clientSearch.toLowerCase())
                ).length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
                    <div className="max-h-44 overflow-y-auto divide-y divide-border">
                      {clients
                        .filter(c => clientSearch.length === 0 || c.name.toLowerCase().includes(clientSearch.toLowerCase()))
                        .slice(0, 8)
                        .map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors"
                            onMouseDown={() => {
                              form.setValue("clientName", c.name);
                              form.setValue("clientPhone", c.phone ?? "");
                              setClientSearch(c.name);
                              setShowClientSuggestions(false);
                            }}
                          >
                            <p className="text-sm font-medium leading-tight">{c.name}</p>
                            {c.phone && <p className="text-xs text-muted-foreground leading-tight">{c.phone}</p>}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              {form.formState.errors.clientName && <p className="text-xs text-red-500">{form.formState.errors.clientName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Telefone</label>
              <Input {...form.register("clientPhone")} placeholder="(11) 99999-9999" className="rounded-xl h-10 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Serviço *</label>
              <select {...form.register("serviceId")} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Selecione...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — R$ {Number(s.price).toFixed(2).replace(".", ",")}</option>)}
              </select>
              {form.formState.errors.serviceId && <p className="text-xs text-red-500">{form.formState.errors.serviceId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Data *</label>
                <Input type="date" {...form.register("date")} className="rounded-xl h-10 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Hora *</label>
                <Input type="time" {...form.register("startTime")} className="rounded-xl h-10 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Observações</label>
              <Input {...form.register("notes")} placeholder="Opcional..." className="rounded-xl h-10 text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 rounded-xl h-10 text-sm" onClick={() => { setIsCreateOpen(false); setClientSearch(""); setShowClientSuggestions(false); }}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending} className="flex-1 rounded-xl h-10 text-sm">
                {createMut.isPending ? "Salvando..." : "Confirmar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── APPOINTMENT DETAIL MODAL ── */}
      <Dialog open={!!selectedApt} onOpenChange={o => !o && setSelectedApt(null)}>
        <DialogContent className="rounded-2xl max-w-sm mx-4 sm:mx-auto p-0 overflow-hidden">
          {selectedApt && (
            <>
              <div className={`px-6 pt-6 pb-5 ${
                selectedApt.status === "confirmed" ? "bg-sky-50 dark:bg-sky-900/20" :
                selectedApt.status === "completed" ? "bg-slate-50 dark:bg-slate-900/20" :
                selectedApt.status === "cancelled" ? "bg-red-50 dark:bg-red-900/20" : "bg-muted"
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                      {selectedApt.status === "confirmed" ? "✅ Confirmado" :
                       selectedApt.status === "completed" ? "🎉 Concluído" :
                       selectedApt.status === "cancelled" ? "❌ Cancelado" : "🔒 Bloqueado"}
                    </p>
                    <h3 className="text-xl font-bold">{selectedApt.clientName}</h3>
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
                    {format(new Date(selectedApt.date + "T00:00:00"), "dd/MM/yyyy")} • {selectedApt.startTime} – {selectedApt.endTime}
                  </span>
                </div>
                {selectedApt.clientPhone && <p className="text-sm text-muted-foreground mt-1">📞 {selectedApt.clientPhone}</p>}
                {selectedApt.notes && <p className="text-sm text-muted-foreground mt-1 italic">💬 {selectedApt.notes}</p>}
              </div>

              <div className="p-4 space-y-2">
                {selectedApt.status === "confirmed" && (
                  <>
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">Pagamento</p>

                    {/* Paid / Pending toggle */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => setIsPendingPayment(false)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          !isPendingPayment ? "bg-emerald-500 text-white border-emerald-500" : "border-border hover:bg-muted"
                        }`}
                      >
                        ✅ Pago
                      </button>
                      <button
                        onClick={() => setIsPendingPayment(true)}
                        className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                          isPendingPayment ? "bg-amber-400 text-white border-amber-400" : "border-border hover:bg-muted"
                        }`}
                      >
                        ⏳ Pendente
                      </button>
                    </div>

                    {/* Payment method — only when paid */}
                    {!isPendingPayment && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {(["pix", "cash", "card"] as const).map(m => (
                          <button key={m} onClick={() => setPaymentMethod(m)}
                            className={`py-2.5 rounded-xl text-xs font-medium border transition-all ${
                              paymentMethod === m
                                ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                : "border-border hover:bg-muted"
                            }`}>
                            {m === "pix" ? "💸 Pix" : m === "cash" ? "💵 Dinheiro" : "💳 Cartão"}
                          </button>
                        ))}
                      </div>
                    )}

                    <Button
                      className={`w-full rounded-xl h-11 font-semibold text-white ${isPendingPayment ? "bg-amber-400 hover:bg-amber-500" : "bg-emerald-500 hover:bg-emerald-600"}`}
                      onClick={() => statusMut.mutate({
                        id: selectedApt.id,
                        data: isPendingPayment
                          ? { status: "completed", paymentStatus: "pending" }
                          : { status: "completed", paymentMethod }
                      })}
                      disabled={statusMut.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {isPendingPayment ? "Concluir com Pagamento Pendente" : "Marcar como Concluído"}
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl h-10 text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => statusMut.mutate({ id: selectedApt.id, data: { status: "cancelled" } })}
                      disabled={statusMut.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm"
                    className="flex-1 rounded-xl text-red-500 border-red-200 hover:bg-red-50 h-10"
                    onClick={() => { if (confirm("Excluir permanentemente?")) deleteMut.mutate({ id: selectedApt.id }); }}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 rounded-xl h-10" onClick={() => setSelectedApt(null)}>Fechar</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
