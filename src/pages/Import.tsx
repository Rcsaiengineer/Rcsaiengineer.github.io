import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, Wallet, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Import() {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [importType, setImportType] = useState<'carteira' | 'despesas'>('carteira');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [wallets, setWallets] = useState<any[]>([]);
  const [mapping, setMapping] = useState<any>({});
  const [result, setResult] = useState<any>(null);

  const requiredFieldsCarteira = ['ticker', 'quantidade', 'preco_medio', 'classe'];
  const optionalFieldsCarteira = ['cotacao_atual', 'percentual_ideal', 'setor', 'corretora'];
  
  const requiredFieldsDespesas = ['valor', 'data', 'categoria', 'descricao'];
  const optionalFieldsDespesas = ['forma_pagamento', 'recorrente'];

  const handleFileUpload = async (file: File, tipo: 'carteira' | 'despesas') => {
    setImportType(tipo);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('Arquivo vazio ou inválido');
      }

      const headerLine = lines[0];
      const parsedHeaders = headerLine.split(/[,;]/);
      setHeaders(parsedHeaders);

      const data = lines.slice(1).map(line => {
        const values = line.split(/[,;]/);
        const row: any = {};
        parsedHeaders.forEach((header, index) => {
          row[header] = values[index]?.trim();
        });
        return row;
      });

      setCsvData(data);
      
      // Auto-detect mappings
      const autoMapping: any = {};
      const requiredFields = tipo === 'carteira' ? requiredFieldsCarteira : requiredFieldsDespesas;
      
      requiredFields.forEach(field => {
        const matchingHeader = parsedHeaders.find(h => 
          h.toLowerCase().includes(field.toLowerCase()) ||
          field.toLowerCase().includes(h.toLowerCase())
        );
        if (matchingHeader) {
          autoMapping[field] = matchingHeader;
        }
      });
      
      setMapping(autoMapping);
      setShowMapping(true);

      if (tipo === 'carteira') {
        // Load wallets
        const { data: walletsData } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user?.id);
        setWallets(walletsData || []);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Erro ao ler arquivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    const requiredFields = importType === 'carteira' ? requiredFieldsCarteira : requiredFieldsDespesas;
    
    // Validate mapping
    for (const field of requiredFields) {
      if (!mapping[field]) {
        toast.error(`Campo obrigatório não mapeado: ${field}`);
        return;
      }
    }

    if (importType === 'carteira' && !selectedWallet) {
      toast.error('Selecione uma carteira');
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('import-data', {
        body: {
          tipo: importType,
          data: csvData,
          mapeamento: mapping,
          wallet_id: selectedWallet
        }
      });

      if (error) throw error;

      if (data.success) {
        setResult(data);
        setShowMapping(false);
        toast.success(`Importação concluída! ${data.imported_count} itens importados.`);
      } else {
        throw new Error('Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erro ao importar dados');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Importar Dados</h1>
        <p className="text-muted-foreground">Importe dados de carteira ou despesas via CSV/Excel</p>
      </div>

      <Tabs defaultValue="carteira" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="carteira" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Carteira
          </TabsTrigger>
          <TabsTrigger value="despesas" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Despesas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="carteira" className="space-y-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Importar Ativos da Carteira
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Formato esperado (CSV):</p>
                <code className="text-xs block whitespace-pre">
                  ticker,quantidade,preco_medio,classe,setor,corretora,cotacao_atual,percentual_ideal
                  PETR4,100,28.50,Ação,Petróleo,Clear,30.20,10
                </code>
              </div>

              <label className="block">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'carteira');
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
                    <Upload className="h-5 w-5" />
                    Escolher Arquivo CSV
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas" className="space-y-6">
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                Importar Despesas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Formato esperado (CSV):</p>
                <code className="text-xs block whitespace-pre">
                  data,descricao,valor,categoria,forma_pagamento,recorrente
                  2025-01-15,Almoço,45.50,Alimentação,Crédito,Não
                </code>
              </div>

              <label className="block">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'despesas');
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
                    <Upload className="h-5 w-5" />
                    Escolher Arquivo CSV
                  </span>
                </Button>
              </label>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {result && (
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              Resultado da Importação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-success/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Importados</p>
                <p className="text-2xl font-bold text-success">{result.imported_count}</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm text-muted-foreground">Ignorados</p>
                <p className="text-2xl font-bold text-destructive">{result.skipped_count}</p>
              </div>
            </div>

            {result.new_categories_created && result.new_categories_created.length > 0 && (
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-sm font-medium mb-2">Novas categorias criadas:</p>
                <ul className="text-sm space-y-1">
                  {result.new_categories_created.map((cat: string, i: number) => (
                    <li key={i}>• {cat}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium mb-2 text-destructive">Erros:</p>
                <ul className="text-xs space-y-1 text-destructive/80">
                  {result.errors.map((err: string, i: number) => (
                    <li key={i}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showMapping} onOpenChange={setShowMapping}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mapear Colunas</DialogTitle>
            <DialogDescription>
              Associe as colunas do arquivo aos campos do sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {importType === 'carteira' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Carteira de Destino</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedWallet}
                  onChange={(e) => setSelectedWallet(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">Campos Obrigatórios</p>
              {(importType === 'carteira' ? requiredFieldsCarteira : requiredFieldsDespesas).map(field => (
                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                  <label className="text-sm font-medium">{field}</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  >
                    <option value="">Selecione coluna...</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <p className="font-medium text-sm">Campos Opcionais</p>
              {(importType === 'carteira' ? optionalFieldsCarteira : optionalFieldsDespesas).map(field => (
                <div key={field} className="grid grid-cols-2 gap-4 items-center">
                  <label className="text-sm text-muted-foreground">{field}</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                  >
                    <option value="">Não mapear</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <Button
              onClick={handleImport}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? 'Importando...' : `Importar ${csvData.length} registros`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}