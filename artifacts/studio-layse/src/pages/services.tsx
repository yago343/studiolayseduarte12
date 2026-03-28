import { useState } from "react";
import { useListServices, useCreateService, useUpdateService, useDeleteService, getListServicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Clock, DollarSign, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const serviceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Preço inválido"),
  durationMinutes: z.coerce.number().min(1, "Duração inválida"),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

export default function ServicesPage() {
  const { data: services, isLoading } = useListServices();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createMut = useCreateService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast({ title: "Serviço criado com sucesso ✨" });
        closeModal();
      }
    }
  });

  const updateMut = useUpdateService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast({ title: "Serviço atualizado com sucesso" });
        closeModal();
      }
    }
  });

  const deleteMut = useDeleteService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast({ title: "Serviço removido" });
      }
    }
  });

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", description: "", price: 0, durationMinutes: 60 }
  });

  const openCreate = () => {
    setEditingId(null);
    form.reset({ name: "", description: "", price: 0, durationMinutes: 60 });
    setIsModalOpen(true);
  };

  const openEdit = (service: any) => {
    setEditingId(service.id);
    form.reset({
      name: service.name,
      description: service.description || "",
      price: service.price,
      durationMinutes: service.durationMinutes
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    form.reset();
  };

  const onSubmit = (data: ServiceFormValues) => {
    if (editingId) {
      updateMut.mutate({ id: editingId, data });
    } else {
      createMut.mutate({ data });
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Serviços</h1>
          <p className="text-muted-foreground mt-1">Gerencie os procedimentos oferecidos no estúdio.</p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover-elevate">
          <Plus className="w-5 h-5 mr-2" /> Novo Serviço
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted rounded-3xl border-none" />)}
        </div>
      ) : services?.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-border/50">
          <Sparkles className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-xl font-medium">Nenhum serviço cadastrado</h3>
          <p className="text-muted-foreground mt-2 mb-6">Comece adicionando seu primeiro procedimento.</p>
          <Button onClick={openCreate} variant="outline" className="rounded-xl">Adicionar Serviço</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services?.map((service) => (
            <Card key={service.id} className="rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 border-border/50 overflow-hidden group">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg" onClick={() => openEdit(service)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg" onClick={() => {
                      if(confirm("Tem certeza que deseja excluir?")) deleteMut.mutate({ id: service.id });
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-2">{service.name}</h3>
                {service.description && <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{service.description}</p>}
                
                <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border/50">
                  <div className="flex items-center text-sm font-medium text-foreground">
                    <DollarSign className="w-4 h-4 mr-1 text-primary" />
                    {formatCurrency(service.price)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 mr-1" />
                    {service.durationMinutes} min
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary/10 p-6 pb-8">
            <DialogTitle className="text-2xl text-foreground">
              {editingId ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Preencha os detalhes do procedimento abaixo.</p>
          </div>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 -mt-4 bg-card rounded-t-3xl space-y-4 relative z-10">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Serviço</label>
              <Input {...form.register("name")} className="rounded-xl bg-background border-border/50 focus-visible:ring-primary/20" placeholder="Ex: Alongamento de Cílios" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição (Opcional)</label>
              <Input {...form.register("description")} className="rounded-xl bg-background border-border/50 focus-visible:ring-primary/20" placeholder="Detalhes do procedimento..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Preço (R$)</label>
                <Input type="number" step="0.01" {...form.register("price")} className="rounded-xl bg-background border-border/50 focus-visible:ring-primary/20" />
                {form.formState.errors.price && <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Duração (min)</label>
                <Input type="number" {...form.register("durationMinutes")} className="rounded-xl bg-background border-border/50 focus-visible:ring-primary/20" />
                {form.formState.errors.durationMinutes && <p className="text-xs text-destructive">{form.formState.errors.durationMinutes.message}</p>}
              </div>
            </div>

            <DialogFooter className="pt-4 mt-6 border-t border-border/50">
              <Button type="button" variant="ghost" onClick={closeModal} className="rounded-xl">Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending} className="rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
