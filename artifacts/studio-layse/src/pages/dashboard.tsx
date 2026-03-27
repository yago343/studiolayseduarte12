import { useGetDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Users, Calendar as CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { data, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-serif font-bold">Visão Geral</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="rounded-2xl border-none shadow-sm"><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) return <div>Erro ao carregar dados.</div>;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground">Olá, Layse! ✨</h1>
        <p className="text-muted-foreground mt-1">Aqui está o resumo do seu estúdio hoje.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Faturamento Hoje" 
          value={formatCurrency(data.todayRevenue)} 
          icon={<DollarSign className="w-5 h-5 text-emerald-500" />} 
          trend="+12% que ontem"
          trendUp={true}
        />
        <MetricCard 
          title="Faturamento Mês" 
          value={formatCurrency(data.monthRevenue)} 
          icon={<TrendingUp className="w-5 h-5 text-primary" />} 
        />
        <MetricCard 
          title="Agendamentos Hoje" 
          value={data.todayAppointments.toString()} 
          icon={<CalendarIcon className="w-5 h-5 text-blue-500" />} 
        />
        <MetricCard 
          title="Ticket Médio" 
          value={formatCurrency(data.averageTicket)} 
          icon={<Users className="w-5 h-5 text-purple-500" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts */}
        <Card className="lg:col-span-2 rounded-3xl shadow-sm border-border/50 hover-elevate overflow-hidden">
          <CardHeader className="bg-secondary/30 pb-4 border-b border-border/50">
            <CardTitle className="text-lg font-serif">Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyRevenue}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))'}} tickFormatter={(val) => `R$${val}`} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Receita']}
                  />
                  <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="rounded-3xl shadow-sm border-border/50 hover-elevate">
          <CardHeader className="bg-secondary/30 pb-4 border-b border-border/50">
            <CardTitle className="text-lg font-serif">Top Serviços</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topServices} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="serviceName" type="category" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', fontSize: 13}} width={100} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Appointments */}
      <Card className="rounded-3xl shadow-sm border-border/50">
        <CardHeader className="bg-secondary/30 pb-4 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-serif">Próximos Atendimentos Hoje</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.upcomingAppointments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
              <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
              <p>Nenhum agendamento para as próximas horas.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {data.upcomingAppointments.map((apt) => (
                <div key={apt.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-colors gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
                      <span className="font-bold">{apt.startTime}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-lg">{apt.clientName}</h4>
                      <p className="text-sm text-muted-foreground">{apt.serviceName} • {formatCurrency(apt.servicePrice)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 
                      apt.status === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                    }`}>
                      {apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'completed' ? 'Concluído' : apt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value, icon, trend, trendUp }: any) {
  return (
    <Card className="rounded-3xl shadow-sm border-border/50 hover-elevate overflow-hidden relative">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="p-2 bg-background rounded-xl shadow-sm border border-border/50">{icon}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-2xl sm:text-3xl font-bold font-serif text-foreground">{value}</h3>
        </div>
        {trend && (
          <p className={`text-xs mt-2 font-medium ${trendUp ? 'text-emerald-600' : 'text-destructive'}`}>
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
