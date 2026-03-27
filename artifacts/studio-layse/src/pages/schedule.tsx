import { useGetSchedule, useUpdateSchedule, getGetScheduleQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";
import { useState, useEffect } from "react";

export default function SchedulePage() {
  const { data: originalSchedule, isLoading } = useGetSchedule();
  const [schedule, setSchedule] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (originalSchedule) {
      setSchedule(JSON.parse(JSON.stringify(originalSchedule)));
    }
  }, [originalSchedule]);

  const updateMut = useUpdateSchedule({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetScheduleQueryKey() });
        toast({ title: "Horários salvos com sucesso!" });
      }
    }
  });

  if (isLoading) return <div>Carregando...</div>;

  const handleUpdate = (index: number, field: string, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
  };

  const handleSave = () => {
    updateMut.mutate({ data: schedule });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-serif font-bold">Horários de Funcionamento</h1>
        <p className="text-muted-foreground mt-1">Configure os dias e horários que o estúdio estará aberto para agendamentos online.</p>
      </div>

      <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
        <div className="divide-y divide-border">
          {schedule.map((day, index) => (
            <div key={day.id} className={`p-5 flex flex-col lg:flex-row lg:items-center gap-4 transition-colors ${day.isOpen ? 'bg-background' : 'bg-muted/30'}`}>
              <div className="flex items-center gap-4 w-40">
                <Switch 
                  checked={day.isOpen} 
                  onCheckedChange={(val) => handleUpdate(index, 'isOpen', val)} 
                />
                <span className={`font-bold font-serif text-lg ${day.isOpen ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {day.dayName}
                </span>
              </div>
              
              {day.isOpen ? (
                <div className="flex-1 flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-xl border border-border/50">
                    <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                    <Input 
                      type="time" 
                      value={day.openTime || "09:00"} 
                      onChange={(e) => handleUpdate(index, 'openTime', e.target.value)}
                      className="border-none bg-transparent shadow-none w-28 focus-visible:ring-0" 
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input 
                      type="time" 
                      value={day.closeTime || "18:00"} 
                      onChange={(e) => handleUpdate(index, 'closeTime', e.target.value)}
                      className="border-none bg-transparent shadow-none w-28 focus-visible:ring-0" 
                    />
                  </div>
                  
                  <div className="text-sm font-medium text-muted-foreground hidden sm:block">Pausa:</div>
                  
                  <div className="flex items-center gap-2 bg-primary/5 p-1.5 rounded-xl border border-primary/10">
                    <Input 
                      type="time" 
                      value={day.breakStart || ""} 
                      onChange={(e) => handleUpdate(index, 'breakStart', e.target.value)}
                      className="border-none bg-transparent shadow-none w-28 focus-visible:ring-0 text-sm" 
                      placeholder="Início"
                    />
                    <span className="text-muted-foreground text-sm">-</span>
                    <Input 
                      type="time" 
                      value={day.breakEnd || ""} 
                      onChange={(e) => handleUpdate(index, 'breakEnd', e.target.value)}
                      className="border-none bg-transparent shadow-none w-28 focus-visible:ring-0 text-sm" 
                      placeholder="Fim"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-muted-foreground text-sm italic py-2">Fechado neste dia</div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={updateMut.isPending}
          className="rounded-xl h-12 px-8 text-lg bg-primary text-primary-foreground shadow-xl shadow-primary/20"
        >
          {updateMut.isPending ? "Salvando..." : "Salvar Horários"}
        </Button>
      </div>
    </div>
  );
}
