import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Search, UserRound, Mail, Phone, CalendarCheck, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type User = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  totalAppointments: number;
  lastAppointment: string | null;
};

async function fetchUsers(): Promise<User[]> {
  const res = await fetch("/api/clients");
  if (!res.ok) throw new Error("Erro ao buscar usuários");
  return res.json();
}

async function deleteUser(id: number) {
  const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Erro ao remover usuário");
}

export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-registry"],
    queryFn: fetchUsers,
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-registry"] });
      setConfirmDelete(null);
    },
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuários Cadastrados</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Controle de todos os e-mails e cadastros realizados no link público
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Total cadastrados</p>
            <p className="text-3xl font-bold text-foreground">{users.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Com agendamento</p>
            <p className="text-3xl font-bold text-emerald-600">{users.filter(u => u.totalAppointments > 0).length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 col-span-2 sm:col-span-1">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Só cadastro (sem visita)</p>
            <p className="text-3xl font-bold text-amber-500">{users.filter(u => u.totalAppointments === 0).length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-2xl bg-muted/30 border-border/50"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <UserPlus className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Nenhum usuário encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => (
            <Card key={user.id} className="rounded-2xl border-border/50 hover:border-primary/20 transition-colors">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <UserRound className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{user.name}</p>
                        {user.totalAppointments > 0 ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0 rounded-full">
                            {user.totalAppointments} agendamento{user.totalAppointments > 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-50 text-amber-600 text-xs px-2 py-0 rounded-full">
                            Sem agendamento
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 space-y-1">
                        {user.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                          <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Cadastrado em {format(new Date(user.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {confirmDelete === user.id ? (
                      <div className="flex flex-col gap-1.5 items-end">
                        <p className="text-xs text-red-600 font-medium">Remover?</p>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => setConfirmDelete(null)}
                          >
                            Não
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 px-2 text-xs bg-red-500 hover:bg-red-600 text-white"
                            onClick={() => deleteMut.mutate(user.id)}
                            disabled={deleteMut.isPending}
                          >
                            Sim
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground/50 hover:text-red-500 hover:bg-red-50"
                        onClick={() => setConfirmDelete(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
