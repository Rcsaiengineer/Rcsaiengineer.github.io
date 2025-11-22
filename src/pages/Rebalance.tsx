import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export default function Rebalance() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Rebalanceamento</h1>
        <p className="text-muted-foreground">Otimize seus aportes com inteligência</p>
      </div>

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" />
            Em Desenvolvimento
          </CardTitle>
          <CardDescription>
            Esta funcionalidade estará disponível em breve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O módulo de rebalanceamento inteligente permitirá calcular automaticamente onde você deve aportar
            para equilibrar sua carteira de acordo com os percentuais ideais definidos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
