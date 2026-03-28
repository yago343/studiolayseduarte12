import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useGetSettings, useListServices } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar as CalIcon, Clock, User, CheckCircle2, Check } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type AvailabilitySlot = { time: string; available: boolean; reason?: string };

async function fetchAvailability(date: string, serviceIds: number[]): Promise<AvailabilitySlot[]> {
  const params = new URLSearchParams({ date, serviceIds: serviceIds.join(",") });
  const res = await fetch(`/api/availability?${params}`);
  if (!res.ok) throw new Error("Erro ao buscar horários");
  return res.json();
}

async function submitBooking(data: {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceIds: number[];
  date: string;
  startTime: string;
}) {
  const res = await fetch("/api/public/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Erro ao confirmar agendamento");
  return res.json();
}

export default function PublicBooking() {
  const { data: settings } = useGetSettings();
  const { data: services } = useListServices();
  
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  
  const upcomingDays = Array.from({length: 14}).map((_, i) => addDays(new Date(), i));
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const { data: availability, isLoading: loadingAvail } = useQuery({
    queryKey: ["availability", selectedDate, selectedServices],
    queryFn: () => fetchAvailability(selectedDate, selectedServices),
    enabled: selectedServices.length > 0 && !!selectedDate && step === 3,
  });

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  
  const bookMut = useMutation({
    mutationFn: submitBooking,
    onSuccess: () => setStep(5),
  });

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0 || !selectedDate || !selectedTime || !formData.name) return;
    bookMut.mutate({
      clientName: formData.name,
      clientPhone: formData.phone,
      clientEmail: formData.email,
      serviceIds: selectedServices,
      date: selectedDate,
      startTime: selectedTime,
    });
  };

  const toggleService = (id: number) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectedServiceObjects = services?.filter(s => selectedServices.includes(s.id)) ?? [];
  const totalPrice = selectedServiceObjects.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServiceObjects.reduce((sum, s) => sum + s.durationMinutes, 0);

  const studioName = settings?.studioName || "Studio Layse";
  const primaryColor = settings?.primaryColor || "hsl(350 45% 65%)";

  return (
    <div className="min-h-screen bg-background font-sans relative pb-20">
      <div 
        className="absolute top-0 left-0 w-full h-80 bg-cover bg-center z-0 opacity-80"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/hero-bg.png)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/60 to-background" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto pt-16 px-4">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto bg-white rounded-full shadow-xl flex items-center justify-center p-1 mb-4 overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}images/logo-placeholder.png`} alt="Logo" className="w-full h-full object-cover scale-125 object-top" />
          </div>
          <h1 className="text-4xl font-serif font-bold text-foreground mb-2">{studioName}</h1>
          <p className="text-muted-foreground">{settings?.bookingMessage || "Agende seu momento de beleza com facilidade."}</p>
        </div>

        <Card className="rounded-[2rem] shadow-xl border-border/50 bg-card/90 backdrop-blur-xl overflow-hidden">
          <div className="h-1.5 bg-muted w-full">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step / 4) * 100}%`, backgroundColor: primaryColor }} />
          </div>

          <CardContent className="p-6 sm:p-10 min-h-[400px]">
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold mb-2">
                  Qual procedimento?
                </h2>
                <p className="text-sm text-muted-foreground mb-6">Selecione um ou mais serviços</p>
                <div className="space-y-3">
                  {services?.map(s => {
                    const isSelected = selectedServices.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => toggleService(s.id)}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all hover-elevate flex justify-between items-center ${
                          isSelected
                            ? 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10'
                            : 'border-transparent bg-muted/30 hover:bg-primary/5 hover:border-primary/20'
                        }`}
                        style={isSelected ? { borderColor: primaryColor + '80', backgroundColor: primaryColor + '0d' } : {}}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected ? 'border-primary' : 'border-muted-foreground/30'
                            }`}
                            style={isSelected ? { borderColor: primaryColor, backgroundColor: primaryColor } : {}}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{s.name}</h3>
                            {s.description && <p className="text-sm text-muted-foreground mt-0.5">{s.description}</p>}
                            <p className="text-sm text-muted-foreground mt-1">{s.durationMinutes} min</p>
                          </div>
                        </div>
                        <span className="font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full ml-3 whitespace-nowrap">
                          R$ {Number(s.price).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {selectedServices.length > 0 && (
                  <div className="mt-6 p-4 bg-muted/30 rounded-2xl flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{selectedServices.length} serviço(s) • {totalDuration} min</span>
                    <span className="font-bold text-emerald-700">Total: R$ {totalPrice.toFixed(2)}</span>
                  </div>
                )}

                <Button
                  onClick={() => setStep(2)}
                  disabled={selectedServices.length === 0}
                  className="w-full mt-6 rounded-xl h-14 text-lg shadow-xl shadow-primary/20 disabled:opacity-50"
                  style={{ backgroundColor: selectedServices.length > 0 ? primaryColor : undefined }}
                >
                  Continuar
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button variant="ghost" onClick={() => setStep(1)} className="mb-4 -ml-4 text-muted-foreground">← Voltar</Button>
                <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                  <CalIcon className="text-primary w-6 h-6" /> Escolha o dia
                </h2>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {upcomingDays.map(d => {
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const isSelected = selectedDate === dateStr;
                    return (
                      <div
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`p-3 rounded-2xl text-center cursor-pointer transition-all ${
                          isSelected ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105' : 'bg-muted/50 hover:bg-muted'
                        }`}
                        style={isSelected ? { backgroundColor: primaryColor } : {}}
                      >
                        <div className="text-xs font-medium uppercase mb-1 opacity-80">{format(d, 'EEE', { locale: ptBR })}</div>
                        <div className="text-xl font-bold font-serif">{format(d, 'dd')}</div>
                        <div className="text-xs opacity-80 mt-1">{format(d, 'MMM', { locale: ptBR })}</div>
                      </div>
                    );
                  })}
                </div>
                
                <Button
                  onClick={() => setStep(3)}
                  className="w-full mt-8 rounded-xl h-14 text-lg shadow-xl shadow-primary/20"
                  style={{ backgroundColor: primaryColor }}
                >
                  Continuar
                </Button>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button variant="ghost" onClick={() => setStep(2)} className="mb-4 -ml-4 text-muted-foreground">← Voltar</Button>
                <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                  <Clock className="text-primary w-6 h-6" /> Escolha o horário
                </h2>
                
                {loadingAvail ? (
                  <div className="text-center py-10 text-muted-foreground">Carregando horários...</div>
                ) : !availability || availability.length === 0 ? (
                  <div className="text-center py-10 bg-muted/30 rounded-2xl">
                    Nenhum horário disponível neste dia. Tente outra data.
                  </div>
                ) : (
                  <>
                    <div className="flex gap-4 mb-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Disponível</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-muted-foreground/30 inline-block" /> Ocupado</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {availability.map(slot => (
                        <div
                          key={slot.time}
                          onClick={() => { if (slot.available) { setSelectedTime(slot.time); setStep(4); } }}
                          className={`p-4 rounded-xl text-center font-medium transition-colors border ${
                            slot.available
                              ? 'bg-muted/30 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer border-transparent hover:border-emerald-200'
                              : 'bg-muted/10 text-muted-foreground/40 cursor-not-allowed border-transparent line-through'
                          }`}
                        >
                          {slot.time}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Button variant="ghost" onClick={() => setStep(3)} className="mb-4 -ml-4 text-muted-foreground">← Voltar</Button>
                <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                  <User className="text-primary w-6 h-6" /> Seus dados
                </h2>
                
                <form onSubmit={handleBook} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium pl-1">Nome Completo</label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="h-14 rounded-2xl bg-muted/30 border-none px-5 text-lg" placeholder="Como gosta de ser chamada?" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium pl-1">WhatsApp</label>
                    <Input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="h-14 rounded-2xl bg-muted/30 border-none px-5 text-lg" placeholder="(00) 00000-0000" />
                  </div>
                  
                  <div className="mt-8 p-5 bg-primary/5 rounded-2xl border border-primary/10 space-y-2">
                    <h4 className="font-bold mb-3">Resumo do agendamento</h4>
                    {selectedServiceObjects.map(s => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span className="text-foreground">{s.name}</span>
                        <span className="text-emerald-700 font-medium">R$ {Number(s.price).toFixed(2)}</span>
                      </div>
                    ))}
                    {selectedServiceObjects.length > 1 && (
                      <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-2 mt-2">
                        <span>Total</span>
                        <span className="text-emerald-700">R$ {totalPrice.toFixed(2)}</span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground pt-1">
                      {format(new Date(selectedDate), 'dd/MM/yyyy')} às {selectedTime} • {totalDuration} min
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={bookMut.isPending}
                    className="w-full mt-4 rounded-xl h-14 text-lg shadow-xl shadow-primary/20"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {bookMut.isPending ? "Confirmando..." : "Confirmar Agendamento"}
                  </Button>
                </form>
              </div>
            )}

            {step === 5 && (
              <div className="animate-in zoom-in duration-500 text-center py-10">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-serif font-bold mb-3 text-foreground">Tudo certo!</h2>
                <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                  Seu horário foi reservado com sucesso. Te enviamos os detalhes no WhatsApp.
                </p>
                <Button
                  onClick={() => { setStep(1); setSelectedServices([]); setSelectedTime(null); setFormData({name:"",phone:"",email:""}); }}
                  variant="outline"
                  className="mt-10 rounded-xl h-12"
                >
                  Fazer novo agendamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
