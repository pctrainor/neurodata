-- Fix subscription tier constraint to match app tier names
-- The app uses: 'free', 'researcher', 'clinical'
-- The old constraint used: 'free', 'basic', 'premium', 'enterprise'

-- Drop the old constraint
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_subscription_tier_check;

-- Add the new constraint with correct tier names
ALTER TABLE public.users
ADD CONSTRAINT users_subscription_tier_check CHECK (
  subscription_tier = ANY (
    ARRAY[
      'free'::text,
      'researcher'::text,
      'clinical'::text,
      -- Keep legacy values for backwards compatibility
      'basic'::text,
      'premium'::text,
      'enterprise'::text
    ]
  )
);

-- Update any 'basic' users to 'researcher' (equivalent tier)
UPDATE public.users 
SET subscription_tier = 'researcher' 
WHERE subscription_tier = 'basic';

-- Update any 'premium' or 'enterprise' users to 'clinical' (equivalent tier)
UPDATE public.users 
SET subscription_tier = 'clinical' 
WHERE subscription_tier IN ('premium', 'enterprise');

-- IMPORTANT: Run this to fix your specific user (trainorp14@gmail.com)
-- This user has a Stripe subscription but the tier didn't get updated due to the constraint
UPDATE public.users 
SET subscription_tier = 'researcher',
    updated_at = NOW()
WHERE id = 'dfc073a3-84ff-45e7-a8f8-5d8e525a81f7';

-- Also update their credits to match researcher tier (500 credits)
UPDATE public.user_credits
SET credits_balance = 500,
    monthly_allocation = 500,
    updated_at = NOW()
WHERE user_id = 'dfc073a3-84ff-45e7-a8f8-5d8e525a81f7';

-- If no credits record exists, create one
INSERT INTO public.user_credits (user_id, credits_balance, monthly_allocation, bonus_credits, credits_used_this_month)
VALUES ('dfc073a3-84ff-45e7-a8f8-5d8e525a81f7', 500, 500, 0, 0)
ON CONFLICT (user_id) DO NOTHING;
