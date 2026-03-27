import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, CalendarDays, Banknote, Star, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function Dashboard() {
  const { data, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6 pb-6">
        <div>
          <Skeleton className="h-9 w-56 rounded-xl mb-2" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) return (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      Erro ao carregar dados. Tente novamente.
    </div>
  );

  const todayFormatted = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Olá, Layse! <span className="text-primary">✨</span>
          </h1>
          <p className="text-muted-foreground mt-1 capitalize text-sm">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-semibold self-start sm:self-auto">
          <CalendarDays className="w-4 h-4" />
          {data.todayAppointments} agendamentos hoje
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Hoje"
          value={formatCurrency(data.todayRevenue)}
          icon={<Banknote className="w-5 h-5" />}
          color="from-pink-500 to-rose-500"
          iconBg="bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400"
        />
        <MetricCard
          title="Esta semana"
          value={formatCurrency(data.weekRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="from-violet-500 to-purple-600"
          iconBg="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
        />
        <MetricCard
          title="Este mês"
          value={formatCurrency(data.monthRevenue)}
          icon={<Star className="w-5 h-5" />}
          color="from-amber-400 to-orange-500"
          iconBg="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
        <MetricCard
          title="Ticket médio"
          value={formatCurrency(data.averageTicket)}
          icon={<Users className="w-5 h-5" />}
          color="from-teal-400 to-cyan-500"
          iconBg="bg-teal-100 text-teal-600 dark:bg-teal-900/40 dark:text-teal-400"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 rounded-2xl border-border/60 shadow-sm hover-elevate">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold">Receita dos últimos 6 meses</CardTitle>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">Mensal</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="h-[240px] sm:h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyRevenue} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(328, 85%, 52%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(328, 85%, 52%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(val) => `R$${val}`}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                      fontSize: 13
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(328, 85%, 52%)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    dot={{ fill: 'hsl(328, 85%, 52%)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="rounded-2xl border-border/60 shadow-sm hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">Top Serviços</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            {data.topServices.length === 0 ? (
              <div className="h-[240px] sm:h-[280px] flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <Star className="w-8 h-8 opacity-20" />
                Nenhum dado ainda
              </div>
            ) : (
              <div className="h-[240px] sm:h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topServices} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="serviceName"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }}
                      width={90}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        fontSize: 13
                      }}
                      formatter={(value: number) => [value, 'Atendimentos']}
                    />
                    <Bar dataKey="count" fill="hsl(328, 85%, 52%)" radius={[0, 6, 6, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">Próximos Atendimentos</CardTitle>
            <a href="/agenda" className="text-xs text-primary font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity">
              Ver agenda <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.upcomingAppointments.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <CalendarDays className="w-7 h-7 opacity-30" />
              </div>
              <p className="text-sm">Nenhum agendamento próximo.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.upcomingAppointments.map((apt, idx) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl gradient-brand flex flex-col items-center justify-center text-white shrink-0 shadow-sm shadow-primary/20">
                    <span className="text-[11px] font-bold leading-none">{apt.startTime}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">{apt.clientName}</h4>
                    <p className="text-xs text-muted-foreground truncate">{apt.serviceName} • {formatCurrency(apt.servicePrice)}</p>
                  </div>
                  <span className={`hidden sm:inline-flex px-2.5 py-1 text-xs rounded-full font-semibold shrink-0 ${
                    apt.status === 'confirmed'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : apt.status === 'completed'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'completed' ? 'Concluído' : apt.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon, color, iconBg }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  iconBg: string;
}) {
  return (
    <Card className="rounded-2xl border-border/60 shadow-sm hover-elevate overflow-hidden relative group">
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${color} opacity-[0.06] rounded-full blur-2xl translate-x-6 -translate-y-6 group-hover:opacity-10 transition-opacity`} />
      <CardContent className="p-4 sm:p-5">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
          {icon}
        </div>
        <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-lg sm:text-xl font-bold text-foreground leading-tight">{value}</h3>
      </CardContent>
    </Card>
  );
}
