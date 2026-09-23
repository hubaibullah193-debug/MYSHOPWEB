-- Database function to deduct inventory atomically
CREATE OR REPLACE FUNCTION deduct_inventory(
  product_id UUID,
  quantity INT,
  order_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_quantity INT;
BEGIN
  -- Get current quantity with row lock
  SELECT q.quantity INTO current_quantity
  FROM public.product_inventory q
  WHERE q.product_id = deduct_inventory.product_id
  FOR UPDATE;

  -- Check if sufficient inventory
  IF current_quantity < quantity THEN
    RAISE EXCEPTION 'Insufficient inventory for product %', product_id;
  END IF;

  -- Deduct inventory
  UPDATE public.product_inventory
  SET quantity = quantity - deduct_inventory.quantity,
      last_updated = NOW()
  WHERE product_inventory.product_id = deduct_inventory.product_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Inventory deduction failed: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION deduct_inventory(UUID, INT, UUID) TO authenticated;
