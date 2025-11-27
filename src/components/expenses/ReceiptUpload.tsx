import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Camera, Upload, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReceiptUploadProps {
  categories: any[];
  onSuccess: () => void;
}

export function ReceiptUpload({ categories, onSuccess }: ReceiptUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [documentId, setDocumentId] = useState<string>('');

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category_id: '',
    payment_method: 'Crédito',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Por favor, envie uma imagem ou PDF');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('ocr-receipt', {
        body: formData
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Comprovante processado!');
        setDocumentId(data.document_id);
        setExtractedData(data.extracted);
        
        // Pre-fill form with extracted data
        setFormData(prev => ({
          ...prev,
          amount: data.extracted.valor?.toString() || '',
          description: data.extracted.descricao || '',
          expense_date: data.extracted.data || prev.expense_date,
          payment_method: data.extracted.forma_pagamento || prev.payment_method
        }));
        
        setShowForm(true);
      } else {
        throw new Error('Failed to process receipt');
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Erro ao processar comprovante');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!formData.amount || !formData.category_id) {
      toast.error('Preencha valor e categoria');
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .insert([{
          amount: parseFloat(formData.amount),
          description: formData.description,
          category_id: formData.category_id,
          payment_method: formData.payment_method,
          expense_date: formData.expense_date,
          document_id: documentId,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }]);

      if (error) throw error;

      toast.success('Despesa registrada com comprovante!');
      setShowForm(false);
      setFormData({
        amount: '',
        description: '',
        category_id: '',
        payment_method: 'Crédito',
        expense_date: new Date().toISOString().split('T')[0]
      });
      onSuccess();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Erro ao salvar despesa');
    }
  };

  return (
    <>
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            Enviar Comprovante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tire uma foto ou envie um arquivo do comprovante. Usaremos IA para extrair os dados automaticamente.
            </p>
            
            <label className="block">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                disabled={isProcessing}
              />
              <Button
                variant="outline"
                size="lg"
                className="w-full"
                disabled={isProcessing}
                asChild
              >
                <span className="cursor-pointer flex items-center gap-2">
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5" />
                      Escolher Arquivo
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Despesa</DialogTitle>
            <DialogDescription>
              Revise os dados extraídos do comprovante
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoria</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de Pagamento</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              >
                <option value="Crédito">Crédito</option>
                <option value="Débito">Débito</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="PIX">PIX</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              />
            </div>

            <Button onClick={handleConfirm} className="w-full">
              Confirmar e Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}