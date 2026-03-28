import { useState } from "react";
import {
  useGetFinancialSummary, useListIncomes, useListExpenses,
  useCreateIncome, useCreateExpense,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  format, addDays, subDays, startOfMonth, endOfMonth,
  eachDayOfInterval, addMonths, subMonths, startOfWeek,
  getDay, isSameDay, isSameMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Plus, Wallet, TrendingUp, TrendingDown, CreditCard, Banknote,
  Smartphone, Clock, CheckCircle2, ChevronLeft, ChevronRight, CalendarDays,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const apiBase = BASE_URL.replace(/\/$/, "");

/* ─── Mini Calendar (adapted from calendar page) ─────────────── */
function MiniCalendar({
  selected,
  onChange,
  markedDates,
}: {
  selected: Date;
  onChange: (d: Date) => void;
  markedDates: Set<string>;
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

  function DayCell({ day }: { day: Date | null }) {
    if (!day) return <div className="h-9" />;
    const dStr = format(day, "yyyy-MM-dd");
    const isSelected = isSameDay(day, selected);
    const isToday = dStr === todayStr;
    const hasEntry = markedDates.has(dStr);
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
        {hasEntry && (
          <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? "bg-white/70" : "bg-primary"}`} />
        )}
      </button>
    );
  }

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onChange(today)}
          className="flex items-center gap-1.5 text-sm font-semibold capitalize text-foreground hover:text-primary transition-colors">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          {format(viewMonth, "MMMM yyyy", { locale: ptBR })}
        </button>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))}
          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors text-muted-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider py-1">{d}</div>
        ))}
      </div>
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

/* ─── Financial Calendar Tab ─────────────────────────────────── */
function FinanceCalendarTab({ formatCurrency }: { formatCurrency: (v: number) => string }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [addModal, setAddModal] = useState<null | "income" | "expense">(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedStr = format(currentDate, "yyyy-MM-dd");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const isToday = selectedStr === todayStr;
  const dayLabel = isToday ? "Hoje" : format(currentDate, "EEEE", { locale: ptBR });
  const dateLabel = format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR });

  // Load entire month for mini calendar dots
  const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");
  const { data: monthIncomes = [] } = useListIncomes({ startDate: monthStart, endDate: monthEnd });
  const { data: monthExpenses = [] } = useListExpenses({ startDate: monthStart, endDate: monthEnd });

  const dayIncomes = monthIncomes.filter(i => i.date === selectedStr);
  const dayExpenses = monthExpenses.filter(e => e.date === selectedStr);
  const dayTotal = dayIncomes.reduce((s, i) => s + parseFloat(i.amount as any), 0)
    - dayExpenses.reduce((s, e) => s + parseFloat(e.amount as any), 0);

  const markedDates = new Set([
    ...monthIncomes.map(i => i.date),
    ...monthExpenses.map(e => e.date),
  ]);

  const refetchAll = () => queryClient.invalidateQueries();

  const incMut = useCreateIncome({
    onSuccess: () => { refetchAll(); setAddModal(null); toast({ title: "Receita adicionada" }); },
  });
  const expMut = useCreateExpense({
    onSuccess: () => { refetchAll(); setAddModal(null); toast({ title: "Despesa adicionada" }); },
  });

  function IncomeForm() {
    const { register, handleSubmit } = useForm({ defaultValues: { date: selectedStr, paymentMethod: "pix", paymentStatus: "paid" } });
    return (
      <form onSubmit={handleSubmit(d => incMut.mutate({ data: { ...d, amount: Number((d as any).amount) } as any }))} className="space-y-3 p-4">
        <Input required {...register("serviceName")} placeholder="Descrição / Serviço" className="rounded-xl" />
        <Input required type="number" step="0.01" {...register("amount")} placeholder="Valor R$" className="rounded-xl" />
        <select required {...register("paymentStatus")} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm">
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
        </select>
        <select {...register("paymentMethod")} className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm">
          <option value="pix">PIX</option>
          <option value="card">Cartão</option>
          <option value="cash">Dinheiro</option>
        </select>
        <Input {...register("clientName")} placeholder="Nome da cliente (opcional)" className="rounded-xl" />
        <Input required type="date" {...register("date")} className="rounded-xl" />
        <Button type="submit" className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white" disabled={incMut.isPending}>
          Salvar Receita
        </Button>
      </form>
    );
  }

  function ExpenseForm() {
    const { register, handleSubmit } = useForm({ defaultValues: { date: selectedStr } });
    return (
      <form onSubmit={handleSubmit(d => expMut.mutate({ data: { ...d, amount: Number((d as any).amount) } as any }))} className="space-y-3 p-4">
        <Input required {...register("description")} placeholder="Descrição da Despesa" className="rounded-xl" />
        <Input required type="number" step="0.01" {...register("amount")} placeholder="Valor R$" className="rounded-xl" />
        <Input required {...register("category")} placeholder="Categoria (ex: Produtos, Aluguel)" className="rounded-xl" />
        <Input required type="date" {...register("date")} className="rounded-xl" />
        <Button type="submit" className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white" disabled={expMut.isPending}>
          Salvar Despesa
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Day navigation header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(d => subDays(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className={`text-xl font-bold leading-tight capitalize ${isToday ? "text-primary" : "text-foreground"}`}>
              {dayLabel}
            </h2>
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          </div>
          <button onClick={() => setCurrentDate(d => addDays(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-xl border border-border hover:bg-muted transition-colors text-muted-foreground">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <button onClick={() => setCurrentDate(new Date())}
              className="px-3 h-8 rounded-xl border border-primary/30 text-xs font-medium text-primary hover:bg-primary/5 transition-colors">
              Hoje
            </button>
          )}
          <button onClick={() => setAddModal("income")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
            <Plus className="w-3.5 h-3.5" /> Receita
          </button>
          <button onClick={() => setAddModal("expense")}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-destructive text-white text-xs font-semibold shadow-md shadow-destructive/20 hover:bg-destructive/90 transition-all">
            <Plus className="w-3.5 h-3.5" /> Despesa
          </button>
        </div>
      </div>

      {/* Mini calendar */}
      <div className="bg-card border border-border rounded-2xl px-4 pt-4 pb-3 shadow-sm">
        <MiniCalendar selected={currentDate} onChange={setCurrentDate} markedDates={markedDates} />
      </div>

      {/* Day balance */}
      <div className={`flex items-center justify-between px-5 py-3 rounded-2xl border ${
        dayTotal >= 0 ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/30" :
        "bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30"
      }`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Saldo do dia</p>
          <p className={`text-2xl font-bold mt-0.5 ${dayTotal >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {formatCurrency(dayTotal)}
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground space-y-0.5">
          <p>↑ <span className="text-emerald-600 font-semibold">{formatCurrency(dayIncomes.reduce((s, i) => s + parseFloat(i.amount as any), 0))}</span> entradas</p>
          <p>↓ <span className="text-destructive font-semibold">{formatCurrency(dayExpenses.reduce((s, e) => s + parseFloat(e.amount as any), 0))}</span> saídas</p>
        </div>
      </div>

      {/* Incomes for the day */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Receitas</p>
          <button onClick={() => setAddModal("income")}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors dark:bg-emerald-900/30 dark:text-emerald-400">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {dayIncomes.length > 0 ? (
          <div className="divide-y divide-border">
            {dayIncomes.map(inc => {
              const isPending = (inc as any).paymentStatus === "pending";
              return (
                <div key={inc.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${isPending ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-sm ${isPending ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                      {isPending ? "⏳" : "💰"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{inc.serviceName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(inc as any).clientName && `${(inc as any).clientName} · `}
                        {(inc as any).paymentMethod ? (inc as any).paymentMethod.toUpperCase() : "—"}
                        {isPending && " · Pendente"}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold text-sm shrink-0 ${isPending ? "text-amber-600" : "text-emerald-600"}`}>
                    +{formatCurrency(parseFloat(inc.amount as any))}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma receita neste dia</div>
        )}
      </div>

      {/* Expenses for the day */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Despesas</p>
          <button onClick={() => setAddModal("expense")}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-100 text-destructive hover:bg-red-200 transition-colors dark:bg-red-900/30">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {dayExpenses.length > 0 ? (
          <div className="divide-y divide-border">
            {dayExpenses.map(exp => (
              <div key={exp.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-sm bg-red-100 text-destructive">💸</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{exp.category}</p>
                  </div>
                </div>
                <span className="font-bold text-sm shrink-0 text-destructive">-{formatCurrency(parseFloat(exp.amount as any))}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">Nenhuma despesa neste dia</div>
        )}
      </div>

      {/* Modals */}
      <Dialog open={addModal === "income"} onOpenChange={v => !v && setAddModal(null)}>
        <DialogContent className="rounded-3xl border-border">
          <DialogHeader><DialogTitle>Nova Receita — {format(currentDate, "dd/MM/yyyy")}</DialogTitle></DialogHeader>
          <IncomeForm />
        </DialogContent>
      </Dialog>
      <Dialog open={addModal === "expense"} onOpenChange={v => !v && setAddModal(null)}>
        <DialogContent className="rounded-3xl border-border">
          <DialogHeader><DialogTitle>Nova Despesa — {format(currentDate, "dd/MM/yyyy")}</DialogTitle></DialogHeader>
          <ExpenseForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────────── */
export default function FinancesPage() {
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(1)), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });
  const { data: summary } = useGetFinancialSummary(dateRange);
  const { data: incomes } = useListIncomes(dateRange);
  const { data: expenses } = useListExpenses(dateRange);

  const [activeTab, setActiveTab] = useState("calendar");
  const [isIncomeModal, setIsIncomeModal] = useState(false);
  const [isExpenseModal, setIsExpenseModal] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<number | null>(null);
  const [markingPaidMethod, setMarkingPaidMethod] = useState<"pix" | "cash" | "card">("pix");

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const refetchAll = () => queryClient.invalidateQueries();

  const incMut = useCreateIncome({ onSuccess: () => { refetchAll(); setIsIncomeModal(false); toast({ title: "Receita adicionada" }); } });
  const expMut = useCreateExpense({ onSuccess: () => { refetchAll(); setIsExpenseModal(false); toast({ title: "Despesa adicionada" }); } });

  const handleMarkAsPaid = async (incomeId: number) => {
    try {
      await fetch(`${apiBase}/api/finances/incomes/${incomeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod: markingPaidMethod, paymentStatus: "paid" }),
      });
      setMarkingPaidId(null);
      refetchAll();
      toast({ title: "Pagamento registrado!" });
    } catch {
      toast({ title: "Erro ao registrar pagamento", variant: "destructive" });
    }
  };

  function IncomeForm() {
    const { register, handleSubmit } = useForm({ defaultValues: { date: format(new Date(), "yyyy-MM-dd"), paymentMethod: "pix", paymentStatus: "paid" } });
    return (
      <form onSubmit={handleSubmit(d => incMut.mutate({ data: { ...d, amount: Number((d as any).amount) } as any }))} className="space-y-4 p-4">
        <Input required {...register("serviceName")} placeholder="Descrição/Serviço" className="rounded-xl" />
        <Input required type="number" step="0.01" {...register("amount")} placeholder="Valor R$" className="rounded-xl" />
        <select required {...register("paymentStatus")} className="w-full h-10 px-3 rounded-xl border border-input bg-background">
          <option value="paid">Pago</option>
          <option value="pending">Pendente</option>
        </select>
        <select {...register("paymentMethod")} className="w-full h-10 px-3 rounded-xl border border-input bg-background">
          <option value="pix">PIX</option>
          <option value="card">Cartão</option>
          <option value="cash">Dinheiro</option>
        </select>
        <Input required type="date" {...register("date")} className="rounded-xl" />
        <Button type="submit" className="w-full rounded-xl" disabled={incMut.isPending}>Salvar Receita</Button>
      </form>
    );
  }

  function ExpenseForm() {
    const { register, handleSubmit } = useForm({ defaultValues: { date: format(new Date(), "yyyy-MM-dd") } });
    return (
      <form onSubmit={handleSubmit(d => expMut.mutate({ data: { ...d, amount: Number((d as any).amount) } as any }))} className="space-y-4 p-4">
        <Input required {...register("description")} placeholder="Descrição da Despesa" className="rounded-xl" />
        <Input required type="number" step="0.01" {...register("amount")} placeholder="Valor R$" className="rounded-xl" />
        <Input required {...register("category")} placeholder="Categoria (ex: Produtos, Luz)" className="rounded-xl" />
        <Input required type="date" {...register("date")} className="rounded-xl" />
        <Button type="submit" className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white" disabled={expMut.isPending}>Salvar Despesa</Button>
      </form>
    );
  }

  const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
  const pendingCount = incomes?.filter(i => (i as any).paymentStatus === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground mt-1">Acompanhe a saúde financeira do seu negócio.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsExpenseModal(true)} variant="outline" className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10">
            <TrendingDown className="w-4 h-4 mr-2" /> Nova Despesa
          </Button>
          <Button onClick={() => setIsIncomeModal(true)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20">
            <TrendingUp className="w-4 h-4 mr-2" /> Nova Receita
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="calendar" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" /> Calendário
          </TabsTrigger>
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Visão Geral</TabsTrigger>
          <TabsTrigger value="incomes" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Receitas {pendingCount > 0 && <span className="ml-1.5 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Despesas</TabsTrigger>
        </TabsList>

        {/* ── Calendar Tab ── */}
        <TabsContent value="calendar" className="mt-6">
          <FinanceCalendarTab formatCurrency={formatCurrency} />
        </TabsContent>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="flex gap-4 items-center bg-card p-2 rounded-2xl border border-border w-fit shadow-sm">
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} className="border-none bg-transparent shadow-none w-36 focus-visible:ring-0" />
            <span className="text-muted-foreground">até</span>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} className="border-none bg-transparent shadow-none w-36 focus-visible:ring-0" />
          </div>

          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="rounded-3xl shadow-sm border-border hover-elevate">
                <CardContent className="p-5 flex items-center justify-between">
                  <div><p className="text-xs font-medium text-muted-foreground">Entradas</p><p className="text-xl font-bold text-emerald-600 mt-0.5">{formatCurrency((summary as any).totalIncome)}</p></div>
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center"><TrendingUp className="w-4 h-4" /></div>
                </CardContent>
              </Card>
              <Card className="rounded-3xl shadow-sm border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
                <CardContent className="p-5 flex items-center justify-between">
                  <div><p className="text-xs font-medium text-muted-foreground">Pendentes</p><p className="text-xl font-bold text-amber-600 mt-0.5">{formatCurrency((summary as any).totalPending ?? 0)}</p></div>
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center"><Clock className="w-4 h-4" /></div>
                </CardContent>
              </Card>
              <Card className="rounded-3xl shadow-sm border-border hover-elevate">
                <CardContent className="p-5 flex items-center justify-between">
                  <div><p className="text-xs font-medium text-muted-foreground">Saídas</p><p className="text-xl font-bold text-destructive mt-0.5">{formatCurrency((summary as any).totalExpenses)}</p></div>
                  <div className="w-10 h-10 bg-red-100 text-destructive rounded-full flex items-center justify-center"><TrendingDown className="w-4 h-4" /></div>
                </CardContent>
              </Card>
              <Card className="rounded-3xl shadow-sm border-border bg-primary/5 border-primary/20">
                <CardContent className="p-5 flex items-center justify-between">
                  <div><p className="text-xs font-medium text-muted-foreground">Lucro Líquido</p><p className="text-xl font-bold mt-0.5">{formatCurrency((summary as any).netProfit)}</p></div>
                  <div className="w-10 h-10 bg-primary/20 text-primary rounded-full flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-3xl shadow-sm border-border">
              <CardHeader><CardTitle>Receita por Dia</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {summary?.dailyRevenue && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.dailyRevenue}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={d => format(new Date(d), "dd/MM")} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "12px", border: "none" }} formatter={(v: number) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm border-border">
              <CardHeader><CardTitle>Métodos de Pagamento</CardTitle></CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                {summary && (
                  <div className="w-full flex items-center justify-between">
                    <div className="flex-1 h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: "PIX", value: summary.incomeByPaymentMethod.pix },
                              { name: "Cartão", value: summary.incomeByPaymentMethod.card },
                              { name: "Dinheiro", value: summary.incomeByPaymentMethod.cash },
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                          >
                            {PIE_COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-3"><Smartphone className="w-5 h-5 text-[hsl(var(--chart-1))]" /><div><p className="font-bold">{formatCurrency(summary.incomeByPaymentMethod.pix)}</p><p className="text-xs text-muted-foreground">PIX</p></div></div>
                      <div className="flex items-center gap-3"><CreditCard className="w-5 h-5 text-[hsl(var(--chart-2))]" /><div><p className="font-bold">{formatCurrency(summary.incomeByPaymentMethod.card)}</p><p className="text-xs text-muted-foreground">Cartão</p></div></div>
                      <div className="flex items-center gap-3"><Banknote className="w-5 h-5 text-[hsl(var(--chart-3))]" /><div><p className="font-bold">{formatCurrency(summary.incomeByPaymentMethod.cash)}</p><p className="text-xs text-muted-foreground">Dinheiro</p></div></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Incomes Tab ── */}
        <TabsContent value="incomes" className="mt-6 space-y-4">
          <div className="flex gap-4 items-center bg-card p-2 rounded-2xl border border-border w-fit shadow-sm">
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} className="border-none bg-transparent shadow-none w-36 focus-visible:ring-0" />
            <span className="text-muted-foreground">até</span>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} className="border-none bg-transparent shadow-none w-36 focus-visible:ring-0" />
          </div>
          <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
            <div className="divide-y divide-border">
              {incomes?.map(inc => {
                const isPending = (inc as any).paymentStatus === "pending";
                return (
                  <div key={inc.id} className={`p-4 flex items-center justify-between gap-3 hover:bg-muted/30 ${isPending ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground truncate">{inc.serviceName}</p>
                        {isPending && <span className="shrink-0 text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 px-2 py-0.5 rounded-full">Pendente</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(inc.date), "dd/MM/yyyy")}
                        {(inc as any).clientName && ` · ${(inc as any).clientName}`}
                        {(inc as any).paymentMethod && ` · ${(inc as any).paymentMethod.toUpperCase()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-bold ${isPending ? "text-amber-600" : "text-emerald-600"}`}>+{formatCurrency(inc.amount)}</span>
                      {isPending && markingPaidId !== inc.id && (
                        <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => setMarkingPaidId(inc.id)}>Registrar Pgto</Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {markingPaidId !== null && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 space-y-3">
                  <p className="text-sm font-bold">Registrar pagamento</p>
                  <div className="flex gap-2">
                    {(["pix", "cash", "card"] as const).map(m => (
                      <button key={m} onClick={() => setMarkingPaidMethod(m)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${markingPaidMethod === m ? "bg-primary text-white border-primary" : "border-border bg-background hover:bg-muted"}`}>
                        {m === "pix" ? "💸 PIX" : m === "cash" ? "💵 Dinheiro" : "💳 Cartão"}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => handleMarkAsPaid(markingPaidId)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Confirmar
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setMarkingPaidId(null)}>Cancelar</Button>
                  </div>
                </div>
              )}
              {incomes?.length === 0 && <div className="p-10 text-center text-muted-foreground">Nenhuma receita no período.</div>}
            </div>
          </Card>
        </TabsContent>

        {/* ── Expenses Tab ── */}
        <TabsContent value="expenses" className="mt-6 space-y-4">
          <div className="flex gap-4 items-center bg-card p-2 rounded-2xl border border-border w-fit shadow-sm">
            <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({ ...dateRange, startDate: e.target.value })} className="border-none bg-transparent shadow-none w-36 focus-visible:ring-0" />
            <span className="text-muted-foreground">até</span>
            <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({ ...dateRange, endDate: e.target.value })} className="border-none bg-transparent shadow-none w-36 focus-visible:ring-0" />
          </div>
          <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
            <div className="divide-y divide-border">
              {expenses?.map(exp => (
                <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                  <div>
                    <p className="font-bold text-foreground">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(exp.date), "dd/MM/yyyy")} · {exp.category}</p>
                  </div>
                  <span className="text-destructive font-bold">-{formatCurrency(exp.amount)}</span>
                </div>
              ))}
              {expenses?.length === 0 && <div className="p-10 text-center text-muted-foreground">Nenhuma despesa no período.</div>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isIncomeModal} onOpenChange={setIsIncomeModal}>
        <DialogContent className="rounded-3xl border-border"><DialogHeader><DialogTitle className="text-xl">Adicionar Receita Manual</DialogTitle></DialogHeader><IncomeForm /></DialogContent>
      </Dialog>
      <Dialog open={isExpenseModal} onOpenChange={setIsExpenseModal}>
        <DialogContent className="rounded-3xl border-border"><DialogHeader><DialogTitle className="text-xl">Nova Despesa</DialogTitle></DialogHeader><ExpenseForm /></DialogContent>
      </Dialog>
    </div>
  );
}
