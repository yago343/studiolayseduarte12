import { useState } from "react";
import { useGetFinancialSummary, useListIncomes, useListExpenses, useCreateIncome, useCreateExpense } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Wallet, TrendingUp, TrendingDown, CreditCard, Banknote, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function FinancesPage() {
  const [dateRange, setDateRange] = useState({ startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') });
  
  const { data: summary } = useGetFinancialSummary(dateRange);
  const { data: incomes } = useListIncomes(dateRange);
  const { data: expenses } = useListExpenses(dateRange);
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isIncomeModal, setIsIncomeModal] = useState(false);
  const [isExpenseModal, setIsExpenseModal] = useState(false);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const incMut = useCreateIncome({ onSuccess: () => { queryClient.invalidateQueries(); setIsIncomeModal(false); toast({title:"Receita adicionada"}); }});
  const expMut = useCreateExpense({ onSuccess: () => { queryClient.invalidateQueries(); setIsExpenseModal(false); toast({title:"Despesa adicionada"}); }});

  const IncomeForm = () => {
    const { register, handleSubmit } = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd') }});
    return (
      <form onSubmit={handleSubmit(d => incMut.mutate({ data: { ...d, amount: Number(d.amount), paymentMethod: d.paymentMethod as any } as any }))} className="space-y-4 p-4">
        <Input required {...register("serviceName")} placeholder="Descrição/Serviço" className="rounded-xl" />
        <Input required type="number" step="0.01" {...register("amount")} placeholder="Valor R$" className="rounded-xl" />
        <select required {...register("paymentMethod")} className="w-full h-10 px-3 rounded-xl border border-input bg-background">
          <option value="pix">PIX</option>
          <option value="card">Cartão</option>
          <option value="cash">Dinheiro</option>
        </select>
        <Input required type="date" {...register("date")} className="rounded-xl" />
        <Button type="submit" className="w-full rounded-xl" disabled={incMut.isPending}>Salvar Receita</Button>
      </form>
    );
  };

  const ExpenseForm = () => {
    const { register, handleSubmit } = useForm({ defaultValues: { date: format(new Date(), 'yyyy-MM-dd') }});
    return (
      <form onSubmit={handleSubmit(d => expMut.mutate({ data: { ...d, amount: Number(d.amount) } as any }))} className="space-y-4 p-4">
        <Input required {...register("description")} placeholder="Descrição da Despesa" className="rounded-xl" />
        <Input required type="number" step="0.01" {...register("amount")} placeholder="Valor R$" className="rounded-xl" />
        <Input required {...register("category")} placeholder="Categoria (ex: Produtos, Luz)" className="rounded-xl" />
        <Input required type="date" {...register("date")} className="rounded-xl" />
        <Button type="submit" className="w-full rounded-xl bg-destructive hover:bg-destructive/90 text-white" disabled={expMut.isPending}>Salvar Despesa</Button>
      </form>
    );
  };

  const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold">Financeiro</h1>
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

      <div className="flex gap-4 items-center bg-card p-2 rounded-2xl border border-border w-fit shadow-sm">
        <Input type="date" value={dateRange.startDate} onChange={e => setDateRange({...dateRange, startDate: e.target.value})} className="border-none bg-transparent shadow-none w-36 focus-visible:ring-0" />
        <span className="text-muted-foreground">até</span>
        <Input type="date" value={dateRange.endDate} onChange={e => setDateRange({...dateRange, endDate: e.target.value})} className="border-none bg-transparent shadow-none w-36 focus-visible:ring-0" />
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-3xl shadow-sm border-border hover-elevate">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Entradas</p>
                <h3 className="text-2xl font-bold font-serif text-emerald-600 mt-1">{formatCurrency(summary.totalIncome)}</h3>
              </div>
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center dark:bg-emerald-900/30"><TrendingUp /></div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl shadow-sm border-border hover-elevate">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Saídas</p>
                <h3 className="text-2xl font-bold font-serif text-destructive mt-1">{formatCurrency(summary.totalExpenses)}</h3>
              </div>
              <div className="w-12 h-12 bg-red-100 text-destructive rounded-full flex items-center justify-center dark:bg-red-900/30"><TrendingDown /></div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl shadow-sm border-border hover-elevate bg-primary/5 border-primary/20">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lucro Líquido</p>
                <h3 className="text-3xl font-bold font-serif text-foreground mt-1">{formatCurrency(summary.netProfit)}</h3>
              </div>
              <div className="w-12 h-12 bg-primary/20 text-primary rounded-full flex items-center justify-center"><Wallet /></div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Visão Geral</TabsTrigger>
          <TabsTrigger value="incomes" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Receitas</TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Despesas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-3xl shadow-sm border-border">
              <CardHeader><CardTitle className="font-serif">Receita por Dia</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {summary?.dailyRevenue && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.dailyRevenue}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tickFormatter={d => format(new Date(d), 'dd/MM')} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{borderRadius:'12px', border:'none'}} formatter={(v:number) => formatCurrency(v)} />
                      <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-sm border-border">
              <CardHeader><CardTitle className="font-serif">Métodos de Pagamento</CardTitle></CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                {summary && (
                  <div className="w-full flex items-center justify-between">
                    <div className="flex-1 h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={[
                              { name: 'PIX', value: summary.incomeByPaymentMethod.pix },
                              { name: 'Cartão', value: summary.incomeByPaymentMethod.card },
                              { name: 'Dinheiro', value: summary.incomeByPaymentMethod.cash }
                            ].filter(d => d.value > 0)} 
                            cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                          >
                            {PIE_COLORS.map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                          </Pie>
                          <Tooltip formatter={(v:number) => formatCurrency(v)} />
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

        <TabsContent value="incomes" className="mt-6">
          <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
            <div className="divide-y divide-border">
              {incomes?.map(inc => (
                <div key={inc.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                  <div>
                    <p className="font-bold text-foreground">{inc.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(inc.date), 'dd/MM/yyyy')} • {inc.paymentMethod}</p>
                  </div>
                  <span className="text-emerald-600 font-bold">+{formatCurrency(inc.amount)}</span>
                </div>
              ))}
              {incomes?.length === 0 && <div className="p-10 text-center text-muted-foreground">Nenhuma receita no período.</div>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
            <div className="divide-y divide-border">
              {expenses?.map(exp => (
                <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-muted/30">
                  <div>
                    <p className="font-bold text-foreground">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(exp.date), 'dd/MM/yyyy')} • {exp.category}</p>
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
        <DialogContent className="rounded-3xl border-border"><DialogHeader><DialogTitle className="font-serif text-xl">Adicionar Receita Manual</DialogTitle></DialogHeader><IncomeForm /></DialogContent>
      </Dialog>
      <Dialog open={isExpenseModal} onOpenChange={setIsExpenseModal}>
        <DialogContent className="rounded-3xl border-border"><DialogHeader><DialogTitle className="font-serif text-xl">Nova Despesa</DialogTitle></DialogHeader><ExpenseForm /></DialogContent>
      </Dialog>
    </div>
  );
}
