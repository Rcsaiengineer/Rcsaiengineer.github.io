-- Criar função para recalcular o valor total da carteira
CREATE OR REPLACE FUNCTION calculate_wallet_total(wallet_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallets
  SET total_value = COALESCE((
    SELECT SUM(quantity * COALESCE(current_price, average_price))
    FROM assets
    WHERE wallet_id = wallet_id_param
  ), 0),
  updated_at = now()
  WHERE id = wallet_id_param;
END;
$$;

-- Trigger para atualizar total da carteira quando assets são inseridos
CREATE OR REPLACE FUNCTION update_wallet_on_asset_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_wallet_total(OLD.wallet_id);
    RETURN OLD;
  ELSE
    PERFORM calculate_wallet_total(NEW.wallet_id);
    RETURN NEW;
  END IF;
END;
$$;

-- Criar triggers para assets
DROP TRIGGER IF EXISTS asset_insert_update_wallet ON assets;
DROP TRIGGER IF EXISTS asset_update_update_wallet ON assets;
DROP TRIGGER IF EXISTS asset_delete_update_wallet ON assets;

CREATE TRIGGER asset_insert_update_wallet
AFTER INSERT ON assets
FOR EACH ROW
EXECUTE FUNCTION update_wallet_on_asset_change();

CREATE TRIGGER asset_update_update_wallet
AFTER UPDATE ON assets
FOR EACH ROW
EXECUTE FUNCTION update_wallet_on_asset_change();

CREATE TRIGGER asset_delete_update_wallet
AFTER DELETE ON assets
FOR EACH ROW
EXECUTE FUNCTION update_wallet_on_asset_change();

-- Recalcular todos os totais existentes
DO $$
DECLARE
  wallet_record RECORD;
BEGIN
  FOR wallet_record IN SELECT id FROM wallets
  LOOP
    PERFORM calculate_wallet_total(wallet_record.id);
  END LOOP;
END $$;