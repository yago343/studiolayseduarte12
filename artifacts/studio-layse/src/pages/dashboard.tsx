import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, CalendarDays, Banknote, Users, Star, ArrowUpRight, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from "recharts";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Dashboard() {
  const { data, isLoading, error } = useGetDashboard();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="space-y-5 pb-6">
        <Skeleton className="h-8 w-52 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Skeleton className="h-72 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
      Erro ao carregar dados. Tente novamente.
    </div>
  );

  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-5 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border px-3.5 py-2 rounded-xl shadow-sm self-start sm:self-auto">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-foreground">{data.todayAppointments}</span>
          <span>agendamentos hoje</span>
        </div>
      </div>

      {/* Metric Cards — each with its semantic color */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Faturamento hoje"
          value={formatCurrency(data.todayRevenue)}
          icon={<Banknote className="w-4 h-4" />}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
          accent="border-l-emerald-500"
        />
        <MetricCard
          label="Esta semana"
          value={formatCurrency(data.weekRevenue)}
          icon={<TrendingUp className="w-4 h-4" />}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
          accent="border-l-blue-500"
        />
        <MetricCard
          label="Este mês"
          value={formatCurrency(data.monthRevenue)}
          icon={<BarChart2 className="w-4 h-4" />}
          iconClass="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
          accent="border-l-violet-500"
        />
        <MetricCard
          label="Ticket médio"
          value={formatCurrency(data.averageTicket)}
          icon={<Users className="w-4 h-4" />}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
          accent="border-l-amber-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Revenue area chart */}
        <Card className="lg:col-span-2 rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-2 px-5 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground">Receita mensal</CardTitle>
              <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <div className="h-[220px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyRevenue} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    axisLine={false} tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    dy={6}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={v => `R$${v}`}
                    width={52}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)', fontSize: 12 }}
                    formatter={(v: number) => [formatCurrency(v), 'Receita']}
                  />
                  <Area
                    type="monotone" dataKey="amount"
                    stroke="#10b981" strokeWidth={2}
                    fill="url(#revGrad)"
                    dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Services bar chart */}
        <Card className="rounded-2xl border-border/70 shadow-sm">
          <CardHeader className="pb-2 px-5 pt-5">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-semibold text-foreground">Top Serviços</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            {data.topServices.length === 0 ? (
              <div className="h-[220px] sm:h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Star className="w-8 h-8 opacity-15" />
                <p className="text-sm">Nenhum dado ainda</p>
              </div>
            ) : (
              <div className="h-[220px] sm:h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topServices} layout="vertical" margin={{ top: 0, right: 6, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="serviceName" type="category"
                      axisLine={false} tickLine={false}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      width={88}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.6 }}
                      contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)', fontSize: 12 }}
                      formatter={(v: number) => [v, 'Atendimentos']}
                    />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 5, 5, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="rounded-2xl border-border/70 shadow-sm">
        <CardHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <CardTitle className="text-sm font-semibold text-foreground">Próximos Atendimentos</CardTitle>
            </div>
            <a
              href="/agenda"
              className="text-xs text-primary font-semibold flex items-center gap-1 hover:opacity-75 transition-opacity"
            >
              Ver agenda <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.upcomingAppointments.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <CalendarDays className="w-8 h-8 opacity-15" />
              <p className="text-sm">Nenhum agendamento próximo.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.upcomingAppointments.map((apt) => {
                const aptDate = apt.date ? format(new Date(apt.date + "T12:00:00"), "dd/MM", { locale: ptBR }) : "";
                return (
                  <div
                    key={apt.id}
                    onClick={() => navigate(`/agenda?date=${apt.date}`)}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    {/* Date + Time badge */}
                    <div className="w-14 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center shrink-0 gap-0">
                      <span className="text-[10px] font-semibold text-blue-400 dark:text-blue-500 leading-none">{aptDate}</span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 leading-none">{apt.startTime}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{apt.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate">{apt.serviceName} · {formatCurrency(apt.servicePrice)}</p>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Metric Card ── */
function MetricCard({ label, value, icon, iconClass, accent }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
  accent: string;
}) {
  return (
    <Card className={`rounded-2xl border-border/70 shadow-sm border-l-4 ${accent} hover-elevate`}>
      <CardContent className="p-4 sm:p-5">
        <div className={`w-8 h-8 rounded-xl ${iconClass} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <p className="text-xs text-muted-foreground mb-1 font-medium">{label}</p>
        <p className="text-lg sm:text-xl font-bold text-foreground leading-none">{value}</p>
      </CardContent>
    </Card>
  );
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    pending:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const labels: Record<string, string> = {
    confirmed: 'Confirmado',
    completed: 'Concluído',
    cancelled:  'Cancelado',
    pending:    'Pendente',
  };
  return (
    <span className={`hidden sm:inline-flex px-2.5 py-1 text-xs rounded-full font-semibold shrink-0 ${map[status] ?? 'bg-muted text-muted-foreground'}`}>
      {labels[status] ?? status}
    </span>
  );
}
