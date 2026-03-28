import { useState, useEffect } from "react";
import { useGetSettings, useListServices, useGetAvailability, usePublicBook } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Calendar as CalIcon, Clock, User, CheckCircle2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PublicBooking() {
  const { data: settings } = useGetSettings();
  const { data: services } = useListServices();
  
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  
  // Create an array of next 14 days
  const upcomingDays = Array.from({length: 14}).map((_, i) => addDays(new Date(), i));
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const { data: availability, isLoading: loadingAvail } = useGetAvailability(
    { date: selectedDate, serviceId: selectedService! },
    { query: { enabled: !!selectedService && !!selectedDate } }
  );

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "", email: "" });
  
  const bookMut = usePublicBook({
    mutation: {
      onSuccess: () => setStep(5)
    }
  });

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedService || !selectedDate || !selectedTime || !formData.name) return;
    
    bookMut.mutate({
      data: {
        clientName: formData.name,
        clientPhone: formData.phone,
        clientEmail: formData.email,
        serviceId: selectedService,
        date: selectedDate,
        startTime: selectedTime
      }
    });
  };

  const studioName = settings?.studioName || "Studio Layse";
  const primaryColor = settings?.primaryColor || "hsl(350 45% 65%)";

  return (
    <div className="min-h-screen bg-background font-sans relative pb-20">
      {/* Abstract Hero Background */}
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
          {/* Progress Bar */}
          <div className="h-1.5 bg-muted w-full">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(step / 4) * 100}%`, backgroundColor: primaryColor }} />
          </div>

          <CardContent className="p-6 sm:p-10 min-h-[400px]">
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                  <Sparkles className="text-primary w-6 h-6" /> Qual procedimento?
                </h2>
                <div className="space-y-3">
                  {services?.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => { setSelectedService(s.id); setStep(2); }}
                      className="p-5 rounded-2xl border-2 border-transparent bg-muted/30 hover:bg-primary/5 hover:border-primary/20 cursor-pointer transition-all hover-elevate flex justify-between items-center"
                    >
                      <div>
                        <h3 className="font-bold text-lg">{s.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{s.durationMinutes} minutos</p>
                      </div>
                      <span className="font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                        R$ {s.price}
                      </span>
                    </div>
                  ))}
                </div>
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
                ) : availability?.length === 0 ? (
                  <div className="text-center py-10 bg-muted/30 rounded-2xl">
                    Nenhum horário disponível neste dia. Tente outra data.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {availability?.map(time => (
                      <div 
                        key={time}
                        onClick={() => { setSelectedTime(time); setStep(4); }}
                        className="p-4 rounded-xl text-center font-medium bg-muted/30 hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors border border-transparent hover:border-primary/20"
                      >
                        {time}
                      </div>
                    ))}
                  </div>
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
                  
                  <div className="mt-8 p-5 bg-primary/5 rounded-2xl border border-primary/10">
                    <h4 className="font-bold mb-2">Resumo</h4>
                    <p className="text-sm text-muted-foreground">{services?.find(s => s.id === selectedService)?.name}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(selectedDate), 'dd/MM/yyyy')} às {selectedTime}</p>
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
                  onClick={() => { setStep(1); setSelectedService(null); setSelectedTime(null); setFormData({name:"",phone:"",email:""}); }} 
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
