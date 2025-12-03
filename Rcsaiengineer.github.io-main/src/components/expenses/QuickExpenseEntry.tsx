import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { DollarSign, CreditCard, Wallet, Banknote, Zap } from 'lucide-react';

interface QuickExpenseEntryProps {
  categories: any[];
  onSuccess: () => void;
}

export function QuickExpenseEntry({ categories, onSuccess }: QuickExpenseEntryProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentMethods = [
    { id: 'Débito', icon: CreditCard, label: 'Débito' },
    { id: 'Crédito', icon: CreditCard, label: 'Crédito' },
    { id: 'Dinheiro', icon: Banknote, label: 'Dinheiro' },
    { id: 'PIX', icon: Zap, label: 'PIX' },
  ];

  const handleSubmit = async () => {
    if (!amount || !selectedCategory || !selectedPayment) {
      toast.error('Preencha valor, categoria e forma de pagamento');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user?.id,
          amount: parseFloat(amount),
          category_id: selectedCategory,
          payment_method: selectedPayment,
          description: description || 'Lançamento rápido',
          expense_date: new Date().toISOString().split('T')[0]
        });

      if (error) throw error;

      toast.success('Despesa registrada!');
      setAmount('');
      setDescription('');
      setSelectedCategory('');
      setSelectedPayment('');
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Erro ao salvar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Lançamento Rápido
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Valor (R$)</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categoria</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Selecione...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Forma de Pagamento</label>
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map((method) => (
              <Button
                key={method.id}
                variant={selectedPayment === method.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPayment(method.id)}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <method.icon className="h-4 w-4" />
                <span className="text-xs">{method.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Descrição (opcional)</label>
          <Input
            placeholder="Ex: Almoço, Combustível..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? 'Registrando...' : 'Registrar Despesa'}
        </Button>
      </CardContent>
    </Card>
  );
}