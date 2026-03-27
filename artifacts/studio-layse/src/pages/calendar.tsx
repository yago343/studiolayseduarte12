import { useState, useRef, useEffect } from "react";
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
  subDays,
  startOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  getDay,
  getDaysInMonth,
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
  SlidersHorizontal,
  List,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

/* ─── Constants ─────────────────────────────────────────────── */
const DAY_START = 0;   // 00:00
const DAY_END = 24;    // 24:00
const HOUR_PX = 56;    // px per hour
const MIN_PX = HOUR_PX / 60;
const HOURS = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i);

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

type ViewMode = "day" | "week" | "month";

/* ─── Main Component ─────────────────────────────────────────── */
export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "cash" | "card">("pix");
  const dayStripRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  /* Date range for query */
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = format(view === "month" ? monthStart : view === "week" ? weekStart : currentDate, "yyyy-MM-dd");
  const endDate = format(view === "month" ? monthEnd : view === "week" ? addDays(weekStart, 6) : currentDate, "yyyy-MM-dd");

  const { data: appointments = [], isLoading } = useListAppointments({ startDate, endDate });
  const { data: services = [] } = useListServices();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });

  const createMut = useCreateAppointment({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Agendamento criado! ✨" }); setIsCreateOpen(false); form.reset(); },
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
    defaultValues: { date: format(currentDate, "yyyy-MM-dd"), startTime: "09:00" },
  });

  /* Scroll to current hour on mount */
  useEffect(() => {
    if (gridRef.current) {
      const now = new Date();
      const scrollHour = Math.max(0, now.getHours() - 1);
      gridRef.current.scrollTop = scrollHour * HOUR_PX;
    }
  }, [view]);

  /* Scroll selected day into view in strip */
  useEffect(() => {
    if (dayStripRef.current) {
      const active = dayStripRef.current.querySelector("[data-today='true']");
      active?.scrollIntoView({ inline: "center", behavior: "smooth" });
    }
  }, [currentDate, view]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const DAY_ABBR = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

  /* ─── Strip days ─────────────────────────────────────────────── */
  const stripDays = (() => {
    if (view === "month") {
      return eachDayOfInterval({ start: monthStart, end: monthEnd });
    }
    // show only the 7 days of the current week (Mon–Sun), no repetition
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  })();

  /* ─── Navigate ───────────────────────────────────────────────── */
  const prev = () => {
    if (view === "day") setCurrentDate(d => subDays(d, 1));
    else if (view === "week") setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  };
  const next = () => {
    if (view === "day") setCurrentDate(d => addDays(d, 1));
    else if (view === "week") setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };

  /* ─── Get appointments for a day ─────────────────────────────── */
  const aptsForDay = (dateStr: string) =>
    appointments.filter(a => a.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));

  /* ─── Render appointment block on time grid ───────────────────── */
  function AptBlock({ apt, idx, colCount = 1, colIdx = 0 }: { apt: any; idx: number; colCount?: number; colIdx?: number }) {
    const startMins = timeToMins(apt.startTime);
    const endMins = timeToMins(apt.endTime);
    const top = (startMins - DAY_START * 60) * MIN_PX;
    const height = Math.max((endMins - startMins) * MIN_PX, 24);
    const width = `calc((100% - 2px) / ${colCount})`;
    const left = `calc((100% / ${colCount}) * ${colIdx})`;

    return (
      <button
        onClick={() => setSelectedApt(apt)}
        style={{ top, height, width, left, position: "absolute" }}
        className={`rounded-lg px-2 py-1 text-left text-xs font-medium border overflow-hidden shadow-sm hover:brightness-95 active:scale-[0.98] transition-all ${aptColor(apt.status, idx)}`}
      >
        <div className="font-semibold truncate leading-tight">{apt.serviceName}</div>
        {height > 30 && (
          <div className="flex items-center gap-0.5 mt-0.5 opacity-80">
            <Clock className="w-2.5 h-2.5 shrink-0" />
            <span>{apt.startTime} - {apt.endTime}</span>
          </div>
        )}
        {height > 46 && apt.clientName && (
          <div className="truncate opacity-70 mt-0.5">{apt.clientName}</div>
        )}
      </button>
    );
  }

  /* ─── Time grid column ────────────────────────────────────────── */
  function TimeColumn({ dateStr, apts, showTimeLabels }: { dateStr: string; apts: any[]; showTimeLabels: boolean }) {
    return (
      <div className="flex min-h-full">
        {showTimeLabels && (
          <div className="w-12 shrink-0 relative select-none">
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_PX }} className="relative">
                <span className="absolute -top-2.5 left-0 text-[10px] text-muted-foreground/70 font-medium w-full text-right pr-2">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>
        )}
        {/* Column body */}
        <div className="flex-1 relative border-l border-border/50">
          {HOURS.map(h => (
            <div
              key={h}
              style={{ height: HOUR_PX }}
              className="border-b border-border/30"
            />
          ))}
          {/* Appointment blocks */}
          {apts.map((apt, i) => (
            <AptBlock key={apt.id} apt={apt} idx={i} />
          ))}
          {/* Current time line */}
          {dateStr === todayStr && (() => {
            const now = new Date();
            const mins = now.getHours() * 60 + now.getMinutes();
            const top = (mins - DAY_START * 60) * MIN_PX;
            if (top < 0 || top > (DAY_END - DAY_START) * HOUR_PX) return null;
            return (
              <div style={{ top, position: "absolute", left: 0, right: 0 }} className="flex items-center z-10 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 -ml-1" />
                <div className="flex-1 h-px bg-primary" />
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  /* ─── Week grid (desktop) ─────────────────────────────────────── */
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="flex flex-col gap-0 md:gap-4 w-full overflow-x-hidden">

      {/* ── Top toolbar ── */}
      <div className="pb-2 flex flex-col gap-1.5 w-full">

        {/* MOBILE: single compact row — view pills + date + nav + add */}
        <div className="flex items-center gap-1.5 md:hidden">
          {/* View tabs */}
          <div className="flex items-center bg-muted rounded-full p-0.5 shrink-0">
            {(["day", "week", "month"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 py-1 rounded-full font-medium transition-all text-[10px] ${
                  view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {v === "day" ? "Dia" : v === "week" ? "Sem" : "Mês"}
              </button>
            ))}
          </div>

          {/* Date navigation */}
          <button onClick={prev} className="w-6 h-6 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors shrink-0">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="flex-1 text-center text-xs font-semibold capitalize text-foreground truncate">
            {view === "day"
              ? format(currentDate, "d 'de' MMM", { locale: ptBR })
              : view === "week"
              ? format(weekStart, "d MMM", { locale: ptBR }) + "–" + format(addDays(weekStart, 6), "d MMM", { locale: ptBR })
              : format(currentDate, "MMM yyyy", { locale: ptBR })}
          </span>
          <button onClick={next} className="w-6 h-6 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors shrink-0">
            <ChevronRight className="w-3 h-3" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-2 h-6 rounded-full border border-border text-[9px] font-medium hover:bg-muted transition-colors text-muted-foreground shrink-0">
            Hoje
          </button>

          {/* Add button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* DESKTOP: Row 1 — title + new button */}
        <div className="hidden md:flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie seus agendamentos</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Agendamento
          </Button>
        </div>

        {/* DESKTOP: Row 2 — view tabs + date nav */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-full p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-full font-medium transition-all text-sm ${
                  view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {v === "day" ? "Dia" : v === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5">
            <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-semibold capitalize text-foreground">
              {view === "day"
                ? format(currentDate, "d MMMM", { locale: ptBR })
                : view === "week"
                ? format(weekStart, "d MMM", { locale: ptBR }) + " – " + format(addDays(weekStart, 6), "d MMM", { locale: ptBR })
                : format(currentDate, "MMMM yyyy", { locale: ptBR })}
              {" "}<span className="text-primary font-bold">{format(currentDate, "yyyy")}</span>
            </span>
            <button onClick={() => setCurrentDate(new Date())} className="px-2.5 h-7 rounded-full border border-border text-xs font-medium hover:bg-muted transition-colors">
              Hoje
            </button>
            <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Day strip — horizontal scrollable, compact on mobile */}
        <div
          ref={dayStripRef}
          className="flex gap-1 overflow-x-auto scrollbar-none pb-0.5 w-full"
          style={{ scrollbarWidth: "none" }}
        >
          {stripDays.map(day => {
            const dStr = format(day, "yyyy-MM-dd");
            const isSelected = dStr === format(currentDate, "yyyy-MM-dd");
            const isToday = dStr === todayStr;
            const hasApts = appointments.some(a => a.date === dStr);
            return (
              <button
                key={dStr}
                data-today={isSelected ? "true" : undefined}
                onClick={() => setCurrentDate(day)}
                className={`flex flex-col items-center justify-center min-w-[38px] h-[46px] md:min-w-[42px] md:h-[54px] rounded-xl text-xs font-medium transition-all shrink-0 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-md"
                    : isToday
                    ? "border-2 border-primary text-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="uppercase text-[9px] md:text-[10px] tracking-wide opacity-80">
                  {DAY_ABBR[getDay(day)]}
                </span>
                <span className="text-sm md:text-base font-bold mt-0.5">{format(day, "d")}</span>
                {hasApts && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-primary/60 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── MONTH VIEW ── */}
      {view === "month" && (
        <div className="flex-1 overflow-x-hidden w-full">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/40">
              {["SEG","TER","QUA","QUI","SEX","SÁB","DOM"].map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{d}</div>
              ))}
            </div>
            {/* Calendar grid */}
            {(() => {
              const firstDay = startOfMonth(currentDate);
              const lastDay = endOfMonth(currentDate);
              const startPad = (getDay(firstDay) + 6) % 7;
              const days = eachDayOfInterval({ start: firstDay, end: lastDay });
              const allCells = [...Array(startPad).fill(null), ...days];
              const rows = Math.ceil(allCells.length / 7);
              return Array.from({ length: rows }, (_, r) => (
                <div key={r} className="grid grid-cols-7 border-b border-border/50 last:border-b-0">
                  {allCells.slice(r * 7, r * 7 + 7).map((day, i) => {
                    if (!day) return <div key={i} className="p-2 min-h-[64px]" />;
                    const dStr = format(day, "yyyy-MM-dd");
                    const dayApts = aptsForDay(dStr);
                    const isToday = dStr === todayStr;
                    const isSelected = dStr === format(currentDate, "yyyy-MM-dd");
                    return (
                      <div
                        key={dStr}
                        onClick={() => { setCurrentDate(day); setView("day"); }}
                        className={`p-1.5 min-h-[64px] cursor-pointer hover:bg-muted/40 transition-colors border-l border-border/30 first:border-l-0 ${isSelected ? "bg-primary/5" : ""}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                          isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                        }`}>{format(day, "d")}</div>
                        <div className="space-y-0.5">
                          {dayApts.slice(0, 2).map(apt => (
                            <div key={apt.id} className="text-[9px] bg-primary/15 text-primary rounded px-1 py-0.5 truncate font-medium">
                              {apt.startTime} {apt.clientName}
                            </div>
                          ))}
                          {dayApts.length > 2 && (
                            <div className="text-[9px] text-muted-foreground font-medium">+{dayApts.length - 2}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── DAY VIEW (mobile-first time grid) ── */}
      {view === "day" && (
        <div className="w-full">
          <div className="bg-card md:border md:border-border md:rounded-xl overflow-hidden">
            <div
              ref={gridRef}
              className="overflow-y-auto"
              style={{ height: "calc(100dvh - 200px)", minHeight: 320, scrollbarWidth: "thin" }}
            >
              <div style={{ height: (DAY_END - DAY_START) * HOUR_PX, position: "relative" }}>
                <TimeColumn
                  dateStr={format(currentDate, "yyyy-MM-dd")}
                  apts={aptsForDay(format(currentDate, "yyyy-MM-dd"))}
                  showTimeLabels={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── WEEK VIEW (desktop: grid, mobile: scrollable 3-col) ── */}
      {view === "week" && (
        <div className="w-full flex flex-col" style={{ height: "calc(100dvh - 200px)", minHeight: 320 }}>
          {/* Desktop: 7-col header */}
          <div className="hidden md:grid grid-cols-7 border border-border rounded-t-xl bg-muted/40 overflow-hidden">
            {weekDays.map((day, i) => {
              const isToday = format(day, "yyyy-MM-dd") === todayStr;
              return (
                <div key={i} className={`py-2.5 text-center border-l border-border/50 first:border-l-0 ${isToday ? "bg-primary/5" : ""}`}>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {format(day, "EEE", { locale: ptBR })}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</div>
                </div>
              );
            })}
          </div>

          {/* Scrollable body */}
          <div ref={gridRef} className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
            <div style={{ height: (DAY_END - DAY_START) * HOUR_PX, minWidth: 480 }} className="flex">
              {/* Time labels */}
              <div className="w-12 shrink-0 relative select-none">
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_PX }} className="relative">
                    <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground/70 font-medium">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {/* 7 day columns */}
              {weekDays.map((day, i) => {
                const dStr = format(day, "yyyy-MM-dd");
                const dayApts = aptsForDay(dStr);
                const isToday = dStr === todayStr;
                return (
                  <div key={i} className={`flex-1 relative border-l border-border/40 ${isToday ? "bg-primary/[0.02]" : ""}`}>
                    {/* Mobile day header inside grid */}
                    <div className={`md:hidden sticky top-0 z-20 text-center py-1 text-xs font-semibold border-b border-border/40 bg-card ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {DAY_ABBR[getDay(day)]} {format(day, "d")}
                    </div>

                    {HOURS.map(h => (
                      <div key={h} style={{ height: HOUR_PX }} className="border-b border-border/30" />
                    ))}

                    {dayApts.map((apt, idx) => {
                      const startMins = timeToMins(apt.startTime);
                      const endMins = timeToMins(apt.endTime);
                      const top = (startMins - DAY_START * 60) * MIN_PX;
                      const height = Math.max((endMins - startMins) * MIN_PX, 24);
                      return (
                        <button
                          key={apt.id}
                          onClick={() => setSelectedApt(apt)}
                          style={{ top, height, position: "absolute", left: 1, right: 1 }}
                          className={`rounded-lg px-2 py-1 text-left text-[11px] font-medium border overflow-hidden shadow-sm hover:brightness-95 transition-all ${aptColor(apt.status, idx)}`}
                        >
                          <div className="font-semibold truncate leading-tight">{apt.serviceName}</div>
                          {height > 28 && (
                            <div className="opacity-80 truncate">{apt.startTime} – {apt.endTime}</div>
                          )}
                          {height > 44 && (
                            <div className="opacity-70 truncate">{apt.clientName}</div>
                          )}
                        </button>
                      );
                    })}

                    {isToday && (() => {
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
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE MODAL ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-2xl max-w-md mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Novo Agendamento</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(d => createMut.mutate({ data: { ...d, status: "confirmed" } }))}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da Cliente *</label>
              <Input {...form.register("clientName")} placeholder="Ex: Maria Silva" className="rounded-lg" />
              {form.formState.errors.clientName && <p className="text-xs text-red-500">{form.formState.errors.clientName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Telefone</label>
              <Input {...form.register("clientPhone")} placeholder="(11) 99999-9999" className="rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Serviço *</label>
              <select {...form.register("serviceId")} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Selecione...</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} — R$ {Number(s.price).toFixed(2).replace(".", ",")}</option>)}
              </select>
              {form.formState.errors.serviceId && <p className="text-xs text-red-500">{form.formState.errors.serviceId.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Data *</label>
                <Input type="date" {...form.register("date")} className="rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Hora *</label>
                <Input type="time" {...form.register("startTime")} className="rounded-lg" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Observações</label>
              <Input {...form.register("notes")} placeholder="Opcional..." className="rounded-lg" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending} className="flex-1 rounded-lg">
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
