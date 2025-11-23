import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface Asset {
  id: string;
  ticker: string;
  asset_class: string;
  sector: string | null;
  broker: string | null;
  quantity: number;
  average_price: number;
  current_price: number | null;
  target_percentage: number | null;
}

interface AssetCardProps {
  asset: Asset;
  onEdit: (asset: Asset) => void;
  onDelete: (id: string) => void;
}

export function AssetCard({ asset, onEdit, onDelete }: AssetCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const currentPrice = asset.current_price || asset.average_price;
  const currentValue = asset.quantity * currentPrice;
  const investedValue = asset.quantity * asset.average_price;
  const profit = currentValue - investedValue;
  const profitPercent = (profit / investedValue) * 100;

  return (
    <Card className="glass border-border/50 hover:shadow-glow-primary transition-all group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <span className="text-primary">{asset.ticker}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {asset.asset_class}
              </span>
            </CardTitle>
            {asset.sector && (
              <p className="text-sm text-muted-foreground mt-1">{asset.sector}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass">
              <DropdownMenuItem onClick={() => onEdit(asset)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(asset.id)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Quantidade</p>
            <p className="text-sm font-semibold">{asset.quantity}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Preço Médio</p>
            <p className="text-sm font-semibold">{formatCurrency(asset.average_price)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Cotação Atual</p>
            <p className="text-sm font-semibold">{formatCurrency(currentPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
            <p className="text-sm font-semibold">{formatCurrency(currentValue)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Lucro/Prejuízo</p>
            <p className={`text-sm font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(profit)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Retorno</p>
            <p className={`text-sm font-bold flex items-center justify-end ${profitPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
              {profitPercent >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {profitPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
