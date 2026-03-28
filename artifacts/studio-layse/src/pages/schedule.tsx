import { useGetSchedule, useUpdateSchedule, getGetScheduleQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Clock, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

export default function SchedulePage() {
  const { data: originalSchedule, isLoading } = useGetSchedule();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(null);
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

  const toggleDay = (index: number) => {
    setOpenDay(prev => prev === index ? null : index);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-serif font-bold">Horários de Funcionamento</h1>
        <p className="text-muted-foreground mt-1">Configure os dias e horários que o estúdio estará aberto para agendamentos online.</p>
      </div>

      <Card className="rounded-3xl shadow-sm border-border overflow-hidden">
        <div className="divide-y divide-border">
          {schedule.map((day, index) => {
            const isExpanded = openDay === index;
            return (
              <div key={day.id} className="overflow-hidden">
                {/* Row header — click to expand */}
                <button
                  type="button"
                  onClick={() => toggleDay(index)}
                  className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none ${isExpanded ? 'bg-muted/20' : ''}`}
                >
                  {/* Active bar */}
                  <div className={`w-1 h-8 rounded-full flex-shrink-0 transition-colors ${day.isOpen ? 'bg-primary' : 'bg-muted-foreground/30'}`} />

                  {/* Day name */}
                  <span className={`flex-1 font-bold font-serif text-base ${day.isOpen ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {day.dayName}
                  </span>

                  {/* Status badge */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${day.isOpen ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {day.isOpen ? (day.openTime && day.closeTime ? `${day.openTime} – ${day.closeTime}` : 'Aberto') : 'Fechado'}
                  </span>

                  {/* Chevron */}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 bg-muted/10 border-t border-border/50 space-y-4">
                    {/* Toggle aberto/fechado */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Aberto neste dia</span>
                      <Switch
                        checked={day.isOpen}
                        onCheckedChange={(val) => handleUpdate(index, 'isOpen', val)}
                      />
                    </div>

                    {day.isOpen && (
                      <>
                        {/* Horário de funcionamento */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Horário</p>
                          <div className="flex items-center gap-2 bg-background rounded-xl border border-border px-3 py-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={day.openTime || "09:00"}
                              onChange={(e) => handleUpdate(index, 'openTime', e.target.value)}
                              className="border-none bg-transparent shadow-none w-28 focus-visible:ring-0 p-0 h-auto"
                            />
                            <span className="text-muted-foreground text-sm">até</span>
                            <Input
                              type="time"
                              value={day.closeTime || "18:00"}
                              onChange={(e) => handleUpdate(index, 'closeTime', e.target.value)}
                              className="border-none bg-transparent shadow-none w-28 focus-visible:ring-0 p-0 h-auto"
                            />
                          </div>
                        </div>

                        {/* Pausa */}
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pausa (opcional)</p>
                          <div className="flex items-center gap-2 bg-primary/5 rounded-xl border border-primary/10 px-3 py-2">
                            <Input
                              type="time"
                              value={day.breakStart || ""}
                              onChange={(e) => handleUpdate(index, 'breakStart', e.target.value)}
                              className="border-none bg-transparent shadow-none w-28 focus-visible:ring-0 p-0 h-auto text-sm"
                              placeholder="Início"
                            />
                            <span className="text-muted-foreground text-sm">–</span>
                            <Input
                              type="time"
                              value={day.breakEnd || ""}
                              onChange={(e) => handleUpdate(index, 'breakEnd', e.target.value)}
                              className="border-none bg-transparent shadow-none w-28 focus-visible:ring-0 p-0 h-auto text-sm"
                              placeholder="Fim"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
