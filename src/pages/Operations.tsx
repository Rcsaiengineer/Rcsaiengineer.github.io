import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, History } from 'lucide-react';
import { toast } from 'sonner';
import { OperationForm } from '@/components/operations/OperationForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Operation {
  id: string;
  operation_type: string;
  quantity: number;
  price: number;
  fees: number | null;
  operation_date: string;
  notes: string | null;
  asset_id: string;
  assets: {
    ticker: string;
    asset_class: string;
  };
}

export default function Operations() {
  const { user } = useAuth();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadOperations();
  }, [user]);

  const loadOperations = async () => {
    if (!user) return;

    try {
      const { data: wallets, error: walletsError } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id);

      if (walletsError) throw walletsError;
      
      if (!wallets || wallets.length === 0) {
        setOperations([]);
        setLoading(false);
        return;
      }

      const walletIds = wallets.map(w => w.id);

      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select('id')
        .in('wallet_id', walletIds);

      if (assetsError) throw assetsError;

      if (!assets || assets.length === 0) {
        setOperations([]);
        setLoading(false);
        return;
      }

      const assetIds = assets.map(a => a.id);

      const { data, error } = await supabase
        .from('operations')
        .select(`
          *,
          assets (
            ticker,
            asset_class
          )
        `)
        .in('asset_id', assetIds)
        .order('operation_date', { ascending: false });

      if (error) throw error;
      setOperations(data || []);
    } catch (error: any) {
      console.error('Error loading operations:', error);
      toast.error('Erro ao carregar operações');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getTotalByType = (type: string) => {
    return operations
      .filter(op => op.operation_type === type)
      .reduce((sum, op) => sum + (op.quantity * op.price), 0);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Operações</h1>
          <p className="text-muted-foreground">Histórico de compras e vendas</p>
        </div>
        <Button className="shadow-glow-primary" onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Operação
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Total em Compras</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">{formatCurrency(getTotalByType('buy'))}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Total em Vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{formatCurrency(getTotalByType('sell'))}</p>
          </CardContent>
        </Card>

        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardDescription>Total de Operações</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{operations.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Operations List */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2 h-5 w-5 text-primary" />
            Histórico de Operações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhuma operação registrada</h3>
              <p className="text-muted-foreground mb-6">
                Comece registrando suas compras e vendas
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Primeira Operação
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {operations.map((operation) => (
                <div
                  key={operation.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/30 hover:border-primary/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          operation.operation_type === 'buy'
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {operation.operation_type === 'buy' ? 'COMPRA' : 'VENDA'}
                      </span>
                      <p className="font-bold text-lg">{operation.assets.ticker}</p>
                      <span className="text-sm text-muted-foreground">{operation.assets.asset_class}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Quantidade</p>
                        <p className="font-semibold">{operation.quantity}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Preço</p>
                        <p className="font-semibold">{formatCurrency(operation.price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-semibold">{formatCurrency(operation.quantity * operation.price)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Data</p>
                        <p className="font-semibold">
                          {format(parseISO(operation.operation_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    {operation.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">{operation.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Nova Operação</DialogTitle>
          </DialogHeader>
          <OperationForm
            onSuccess={() => {
              setIsDialogOpen(false);
              loadOperations();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
