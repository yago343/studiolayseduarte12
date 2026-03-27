import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ImageIcon, Plus, Pencil, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Image {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  category: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: "portfolio", label: "Portfólio" },
  { value: "antes-depois", label: "Antes & Depois" },
  { value: "ambiente", label: "Ambiente" },
  { value: "promocao", label: "Promoção" },
];

const defaultForm = { url: "", title: "", description: "", category: "portfolio" };

export default function GalleryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editImage, setEditImage] = useState<Image | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [preview, setPreview] = useState<Image | null>(null);
  const [filter, setFilter] = useState("all");

  const { data: images = [], isLoading } = useQuery<Image[]>({
    queryKey: ["images"],
    queryFn: async () => {
      const res = await fetch("/api/images");
      if (!res.ok) throw new Error("Erro ao buscar imagens");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof defaultForm) => {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao salvar imagem");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Imagem adicionada!" });
      handleClose();
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof defaultForm }) => {
      const res = await fetch(`/api/images/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao atualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Imagem atualizada!" });
      handleClose();
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Imagem removida" });
    },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  const handleOpen = (image?: Image) => {
    if (image) {
      setEditImage(image);
      setForm({ url: image.url, title: image.title || "", description: image.description || "", category: image.category || "portfolio" });
    } else {
      setEditImage(null);
      setForm(defaultForm);
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditImage(null); setForm(defaultForm); };

  const handleSubmit = () => {
    if (!form.url.trim()) {
      toast({ title: "URL da imagem é obrigatória", variant: "destructive" });
      return;
    }
    if (editImage) updateMutation.mutate({ id: editImage.id, data: form });
    else createMutation.mutate(form);
  };

  const filtered = filter === "all" ? images : images.filter(i => i.category === filter);
  const categoryLabel = (val: string | null) => CATEGORIES.find(c => c.value === val)?.label ?? val ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Galeria</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{images.length} imagem{images.length !== 1 ? "s" : ""} cadastrada{images.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => handleOpen()} className="gap-2">
          <Plus className="w-4 h-4" /> Nova Imagem
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: "all", label: "Todas" }, ...CATEGORIES].map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              filter === c.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground gap-3">
          <ImageIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">Nenhuma imagem encontrada</p>
          <p className="text-sm">Adicione fotos do seu trabalho para exibir aqui</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {filtered.map((image) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group relative aspect-square bg-muted rounded-xl overflow-hidden cursor-pointer"
                onClick={() => setPreview(image)}
              >
                <img
                  src={image.url}
                  alt={image.title || ""}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/400x400?text=Imagem"; }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="w-7 h-7"
                      onClick={(e) => { e.stopPropagation(); handleOpen(image); }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="w-7 h-7"
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(image.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {image.title && (
                    <p className="text-white text-xs font-medium truncate">{image.title}</p>
                  )}
                </div>
                {image.category && (
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                    {categoryLabel(image.category)}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby="image-dialog-desc">
          <DialogHeader>
            <DialogTitle>{editImage ? "Editar Imagem" : "Nova Imagem"}</DialogTitle>
          </DialogHeader>
          <p id="image-dialog-desc" className="sr-only">Formulário para {editImage ? "editar" : "adicionar"} imagem</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>URL da Imagem *</Label>
              <Input
                placeholder="https://exemplo.com/foto.jpg"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              />
              {form.url && (
                <img
                  src={form.url}
                  alt="preview"
                  className="w-full h-32 object-cover rounded-lg mt-2"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input
                placeholder="Ex: Alongamento de cílios"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descrição opcional..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editImage ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview lightbox */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setPreview(null)}
          >
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-4 right-4 text-white hover:bg-white/20"
              onClick={() => setPreview(null)}
            >
              <X className="w-5 h-5" />
            </Button>
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={preview.url}
              alt={preview.title || ""}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
              onClick={e => e.stopPropagation()}
            />
            {(preview.title || preview.description) && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 text-white rounded-xl px-5 py-3 text-center max-w-sm">
                {preview.title && <p className="font-semibold">{preview.title}</p>}
                {preview.description && <p className="text-sm text-white/70 mt-1">{preview.description}</p>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
