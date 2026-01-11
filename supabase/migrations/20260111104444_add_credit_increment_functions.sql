/*
  # Add Credit Increment Helper Functions
  
  1. New Functions
    - `increment_user_credits` - Safely increment user credits
    - `increment_api_key_credits` - Safely increment API key credits
  
  2. Purpose
    - Used for refunding credits when generation fails
    - Prevents negative values
*/

-- Function to increment user credits
CREATE OR REPLACE FUNCTION increment_user_credits(
  p_user_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET credits = credits + p_amount
  WHERE id = p_user_id;
END;
$$;

-- Function to increment API key credits
CREATE OR REPLACE FUNCTION increment_api_key_credits(
  p_api_key_id uuid,
  p_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE api_keys
  SET credits = credits + p_amount
  WHERE id = p_api_key_id;
END;
$$;
