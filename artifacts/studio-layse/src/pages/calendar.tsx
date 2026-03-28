import { useState, useRef, useEffect, useMemo } from "react";
import { useSearch } from "wouter";
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
  ChevronDown,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
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
  "bg-sky-200 text-sky-900 border-sky-300",
  "bg-teal-200 text-teal-900 border-teal-300",
  "bg-violet-200 text-violet-900 border-violet-300",
  "bg-rose-200 text-rose-900 border-rose-300",
  "bg-amber-200 text-amber-900 border-amber-300",
  "bg-emerald-200 text-emerald-900 border-emerald-300",
];

function aptColor(status: string, idx: number) {
  if (status === "cancelled") return "bg-red-100 text-red-700 border-red-200 opacity-50";
  if (status === "completed") return "bg-slate-200 text-slate-600 border-slate-300";
  return APT_COLORS[idx % APT_COLORS.length];
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

/* ─── Mini Calendar Component (collapsible) ─────────────────── */
function MiniCalendar({
  selected,
  onChange,
  appointmentDates,
}: {
  selected: Date;
  onChange: (d: Date) => void;
  appointmentDates: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date(selected));
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const weekDays = ["S", "T", "Q", "Q", "S", "S", "D"];

  // Current week (Mon → Sun) for collapsed view
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 });
  const currentWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Full month data for expanded view
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const startPad = (getDay(monthStart) + 6) % 7;
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const allCells: (Date | null)[] = [...Array(startPad).fill(null), ...days];
  const rows = Math.ceil(allCells.length / 7);

  function DayCell({ day }: { day: Date | null }) {
    if (!day) return <div />;
    const dStr = format(day, "yyyy-MM-dd");
    const isSelected = isSameDay(day, selected);
    const isToday = dStr === todayStr;
    const hasApts = appointmentDates.has(dStr);
    const isCurrentMonth = isSameMonth(day, viewMonth);
    return (
      <button
        onClick={() => { onChange(day); setViewMonth(day); if (!expanded) setExpanded(false); }}
        className={`flex flex-col items-center justify-center h-8 rounded-lg text-xs font-medium transition-all relative ${
          isSelected
            ? "bg-primary text-primary-foreground shadow-sm"
            : isToday
            ? "border border-primary text-primary"
            : isCurrentMonth || !expanded
            ? "hover:bg-muted text-foreground"
            : "text-muted-foreground/30"
        }`}
      >
        {format(day, "d")}
        {hasApts && !isSelected && (
          <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary/70" />
        )}
      </button>
    );
  }

  return (
    <div className="w-full select-none">
      {/* Header row: prev | month label + toggle | next */}
      <div className="flex items-center justify-between mb-1.5 px-0.5">
        {expanded ? (
          <button
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-7" />
        )}

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs font-semibold capitalize text-foreground hover:text-primary transition-colors"
        >
          {format(expanded ? viewMonth : selected, "MMMM yyyy", { locale: ptBR })}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded ? (
          <button
            onClick={() => setViewMonth(m => addMonths(m, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="w-7" />
        )}
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-0.5">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-muted-foreground py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Collapsed: only current week */}
      {!expanded && (
        <div className="grid grid-cols-7">
          {currentWeek.map((day, i) => <DayCell key={i} day={day} />)}
        </div>
      )}

      {/* Expanded: full month grid */}
      {expanded && (
        <div>
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className="grid grid-cols-7">
              {allCells.slice(r * 7, r * 7 + 7).map((day, i) => (
                <DayCell key={i} day={day} />
              ))}
            </div>
          ))}
        </div>
      )}
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
  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const HOUR_PX = isMobile ? 48 : 72;
  const MIN_PX = HOUR_PX / 60;

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const selectedStr = format(currentDate, "yyyy-MM-dd");

  /* Wide date range to know which days have appointments for the mini calendar */
  const rangeStart = format(startOfMonth(subMonths(currentDate, 1)), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(addMonths(currentDate, 1)), "yyyy-MM-dd");

  const { data: appointments = [] } = useListAppointments({ startDate: rangeStart, endDate: rangeEnd });
  const { data: services = [] } = useListServices();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });

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
    mutation: { onSuccess: () => { invalidate(); toast({ title: "Status atualizado!" }); setSelectedApt(null); } },
  });
  const deleteMut = useDeleteAppointment({
    mutation: { onSuccess: () => { invalidate(); toast({ title: "Agendamento removido." }); setSelectedApt(null); } },
  });

  const form = useForm<AptForm>({
    resolver: zodResolver(aptSchema),
    defaultValues: { date: selectedStr, startTime: "09:00" },
  });

  /* Sync form date when selected date changes */
  useEffect(() => {
    form.setValue("date", format(currentDate, "yyyy-MM-dd"));
  }, [currentDate]);

  /* Scroll to current hour on mount */
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

  /* ─── Appointment block ───────────────────────────────────────── */
  function AptBlock({ apt, idx }: { apt: any; idx: number }) {
    const startMins = timeToMins(apt.startTime);
    const endMins = timeToMins(apt.endTime);
    const top = (startMins - DAY_START * 60) * MIN_PX;
    const height = Math.max((endMins - startMins) * MIN_PX, 28);
    return (
      <button
        onClick={() => setSelectedApt(apt)}
        style={{ top, height, position: "absolute", left: 3, right: 3 }}
        className={`rounded-lg px-2 py-1.5 text-left text-xs font-medium border overflow-hidden shadow-sm hover:brightness-95 active:scale-[0.98] transition-all flex flex-col justify-start gap-0.5 ${aptColor(apt.status, idx)}`}
      >
        <div className="font-bold truncate leading-tight text-[11px]">{apt.serviceName}</div>
        {height >= 38 && (
          <div className="flex items-center gap-0.5 opacity-80 leading-none">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            <span className="text-[10px]">{apt.startTime} – {apt.endTime}</span>
          </div>
        )}
        {height >= 54 && apt.clientName && (
          <div className="truncate opacity-75 text-[10px] leading-none">{apt.clientName}</div>
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-x-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground leading-tight">Agenda</h1>
          <p className="text-xs text-muted-foreground">
            {selectedStr === todayStr
              ? "Hoje, " + format(currentDate, "d 'de' MMMM", { locale: ptBR })
              : format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedStr !== todayStr && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 h-7 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors text-muted-foreground"
            >
              Hoje
            </button>
          )}
          <button
            onClick={() => { form.setValue("date", selectedStr); setIsCreateOpen(true); }}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Mini Calendar ── */}
      <div className="bg-card border border-border rounded-2xl p-3 mb-3 shadow-sm">
        <MiniCalendar
          selected={currentDate}
          onChange={setCurrentDate}
          appointmentDates={appointmentDates}
        />
      </div>

      {/* ── Day summary chips ── */}
      {todayApts.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {todayApts.map((apt, i) => (
            <button
              key={apt.id}
              onClick={() => setSelectedApt(apt)}
              className={`text-[10px] font-medium px-2.5 py-1 rounded-full border ${aptColor(apt.status, i)} flex items-center gap-1`}
            >
              <Clock className="w-2.5 h-2.5" />
              {apt.startTime} · {apt.clientName || apt.serviceName}
            </button>
          ))}
        </div>
      )}

      {/* ── Time Grid ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex-1 min-h-0 flex flex-col">
        <div ref={gridRef} className="overflow-y-auto flex-1 min-h-0">
          <div style={{ height: TOTAL_HOURS * HOUR_PX, position: "relative" }} className="flex">
            {/* Time labels */}
            <div className="w-12 shrink-0 relative select-none">
              {HOURS.map((h, i) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative">
                  <span className={`absolute left-0 text-[10px] text-muted-foreground/60 font-medium w-full text-right pr-2 ${i === 0 ? 'top-1' : '-top-2.5'}`}>
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
              {/* 20:00 end label */}
              <div className="relative h-0">
                <span className="absolute -top-2.5 left-0 text-[10px] text-muted-foreground/60 font-medium w-full text-right pr-2">
                  20:00
                </span>
              </div>
            </div>

            {/* Grid column */}
            <div className="flex-1 relative border-l border-border/40">
              {HOURS.map(h => (
                <div
                  key={h}
                  style={{ height: HOUR_PX }}
                  className="border-b border-border/25"
                />
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
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 -ml-1" />
                    <div className="flex-1 h-px bg-primary" />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ── CREATE MODAL ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
              <Input {...form.register("clientName")} placeholder="Ex: Maria Silva" className="rounded-lg h-9 text-sm" />
              {form.formState.errors.clientName && <p className="text-xs text-red-500">{form.formState.errors.clientName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Telefone</label>
              <Input {...form.register("clientPhone")} placeholder="(11) 99999-9999" className="rounded-lg h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Serviço *</label>
              <select {...form.register("serviceId")} className="w-full h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Selecione...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — R$ {Number(s.price).toFixed(2).replace(".", ",")}</option>)}
              </select>
              {form.formState.errors.serviceId && <p className="text-xs text-red-500">{form.formState.errors.serviceId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Data *</label>
                <Input type="date" {...form.register("date")} className="rounded-lg h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Hora *</label>
                <Input type="time" {...form.register("startTime")} className="rounded-lg h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Observações</label>
              <Input {...form.register("notes")} placeholder="Opcional..." className="rounded-lg h-9 text-sm" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 rounded-lg h-9 text-sm" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending} className="flex-1 rounded-lg h-9 text-sm">
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
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {selectedApt.status === "confirmed" ? "✅ Confirmado" :
                       selectedApt.status === "completed" ? "🎉 Concluído" :
                       selectedApt.status === "cancelled" ? "❌ Cancelado" : "🔒 Bloqueado"}
                    </p>
                    <h3 className="text-xl font-bold mt-1">{selectedApt.clientName}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{selectedApt.serviceName}</p>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    R$ {Number(selectedApt.servicePrice).toFixed(2).replace(".", ",")}
                  </p>
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
                    <p className="text-xs font-medium text-muted-foreground mb-2">Forma de pagamento:</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(["pix", "cash", "card"] as const).map(m => (
                        <button key={m} onClick={() => setPaymentMethod(m)}
                          className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                            paymentMethod === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                          }`}>
                          {m === "pix" ? "💸 Pix" : m === "cash" ? "💵 Dinheiro" : "💳 Cartão"}
                        </button>
                      ))}
                    </div>
                    <Button
                      className="w-full rounded-lg h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => statusMut.mutate({ id: selectedApt.id, data: { status: "completed", paymentMethod } })}
                      disabled={statusMut.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar como Concluído
                    </Button>
                    <Button variant="outline" className="w-full rounded-lg h-10 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => statusMut.mutate({ id: selectedApt.id, data: { status: "cancelled" } })}
                      disabled={statusMut.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancelar Agendamento
                    </Button>
                  </>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm"
                    className="flex-1 rounded-lg text-red-500 border-red-200 hover:bg-red-50 h-9"
                    onClick={() => { if (confirm("Excluir permanentemente?")) deleteMut.mutate({ id: selectedApt.id }); }}
                    disabled={deleteMut.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 rounded-lg h-9" onClick={() => setSelectedApt(null)}>Fechar</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
