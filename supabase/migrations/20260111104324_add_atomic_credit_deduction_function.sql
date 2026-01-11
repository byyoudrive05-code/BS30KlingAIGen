/*
  # Add Atomic Credit Deduction Function
  
  1. New Function
    - `deduct_credits_atomic` - Atomically deduct credits from user or api_key
      - Prevents race conditions using row-level locking
      - Returns success/failure with available credits
      - Ensures credits cannot go negative
  
  2. Security
    - Function runs with security definer to bypass RLS
    - Additional validation inside function
*/

-- Create function to atomically deduct credits
CREATE OR REPLACE FUNCTION deduct_credits_atomic(
  p_user_id uuid,
  p_credits_needed numeric,
  OUT success boolean,
  OUT api_key_id uuid,
  OUT api_key_value text,
  OUT use_legacy boolean,
  OUT error_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_api_key record;
  v_user record;
  v_current_credits numeric;
BEGIN
  success := false;
  api_key_id := NULL;
  api_key_value := NULL;
  use_legacy := false;
  error_message := NULL;

  -- Try to find and lock an API key with sufficient credits
  SELECT * INTO v_api_key
  FROM api_keys
  WHERE user_id = p_user_id
    AND is_active = true
    AND credits >= p_credits_needed
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    -- Deduct from API key
    UPDATE api_keys
    SET credits = credits - p_credits_needed
    WHERE id = v_api_key.id
    RETURNING id, api_key INTO api_key_id, api_key_value;
    
    success := true;
    use_legacy := false;
    RETURN;
  END IF;

  -- If no API key found, try user's legacy credit
  SELECT * INTO v_user
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    error_message := 'User not found';
    RETURN;
  END IF;

  v_current_credits := COALESCE(v_user.credits, 0);

  IF v_user.api_key IS NOT NULL AND v_current_credits >= p_credits_needed THEN
    -- Deduct from user's legacy credits
    UPDATE users
    SET credits = credits - p_credits_needed
    WHERE id = p_user_id;
    
    api_key_value := v_user.api_key;
    success := true;
    use_legacy := true;
    RETURN;
  END IF;

  -- Not enough credits
  error_message := 'Kredit tidak cukup';
  RETURN;
END;
$$;
