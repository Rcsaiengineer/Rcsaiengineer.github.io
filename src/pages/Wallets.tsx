import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Wallet, TrendingUp, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Wallet {
  id: string;
  name: string;
  description: string | null;
  total_value: number;
  created_at: string;
}

export default function Wallets() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    loadWallets();
  }, [user]);

  const loadWallets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWallets(data || []);
    } catch (error: any) {
      console.error('Error loading wallets:', error);
      toast.error('Erro ao carregar carteiras');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingWallet) {
        // Update existing wallet
        const { error } = await supabase
          .from('wallets')
          .update({
            name: formData.name,
            description: formData.description,
          })
          .eq('id', editingWallet.id);

        if (error) throw error;
        toast.success('Carteira atualizada com sucesso!');
      } else {
        // Create new wallet
        const { error } = await supabase
          .from('wallets')
          .insert({
            user_id: user.id,
            name: formData.name,
            description: formData.description,
          });

        if (error) throw error;
        toast.success('Carteira criada com sucesso!');
      }

      setIsDialogOpen(false);
      setFormData({ name: '', description: '' });
      setEditingWallet(null);
      loadWallets();
    } catch (error: any) {
      console.error('Error saving wallet:', error);
      toast.error('Erro ao salvar carteira');
    }
  };

  const handleEdit = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setFormData({
      name: wallet.name,
      description: wallet.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta carteira?')) return;

    try {
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Carteira excluída com sucesso!');
      loadWallets();
    } catch (error: any) {
      console.error('Error deleting wallet:', error);
      toast.error('Erro ao excluir carteira');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Carteiras</h1>
          <p className="text-muted-foreground">Gerencie seus portfólios de investimento</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-glow-primary">
              <Plus className="mr-2 h-4 w-4" />
              Nova Carteira
            </Button>
          </DialogTrigger>
          <DialogContent className="glass">
            <DialogHeader>
              <DialogTitle>
                {editingWallet ? 'Editar Carteira' : 'Nova Carteira'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Carteira</Label>
                <Input
                  id="name"
                  placeholder="Ex: Carteira Pessoal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo desta carteira..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingWallet ? 'Atualizar' : 'Criar'} Carteira
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Wallets Grid */}
      {wallets.length === 0 ? (
        <Card className="glass border-border/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma carteira encontrada</h3>
            <p className="text-muted-foreground text-center mb-6">
              Crie sua primeira carteira para começar a gerenciar seus investimentos
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Carteira
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <Card key={wallet.id} className="glass border-border/50 hover:shadow-glow-primary transition-all group">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center">
                      <Wallet className="mr-2 h-5 w-5 text-primary" />
                      {wallet.name}
                    </CardTitle>
                    {wallet.description && (
                      <CardDescription className="mt-2">
                        {wallet.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="glass">
                      <DropdownMenuItem onClick={() => handleEdit(wallet)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(wallet.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(wallet.total_value)}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Retorno</span>
                    <span className="text-success flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      0%
                    </span>
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
