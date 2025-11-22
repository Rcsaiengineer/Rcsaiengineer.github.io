import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function Dividends() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Dividendos</h1>
        <p className="text-muted-foreground">Acompanhe sua renda passiva</p>
      </div>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-success" />
            Em Desenvolvimento
          </CardTitle>
          <CardDescription>
            Esta funcionalidade estará disponível em breve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de dividendos permitirá registrar e acompanhar todos os proventos recebidos,
            com histórico mensal, ranking dos maiores pagadores e projeções de renda passiva.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
