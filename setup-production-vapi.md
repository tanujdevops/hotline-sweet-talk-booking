# 🔐 Production VAPI Setup Guide

The vault infrastructure is now ready! Follow these steps to set up your production VAPI accounts securely.

## 📋 Prerequisites

You'll need:
- Your VAPI API keys
- Your VAPI phone number IDs  
- Your VAPI assistant IDs for each plan type

## 🚀 Step 1: Create Production Accounts

Run these SQL commands in your Supabase SQL Editor, replacing the placeholder values:

```sql
-- Create Primary Production Account
SELECT create_vapi_vault_account(
  'Production Primary',
  'YOUR_ACTUAL_VAPI_API_KEY_1',  -- Replace with real API key
  'YOUR_ACTUAL_PHONE_NUMBER_ID_1'::UUID,  -- Replace with real phone ID
  9  -- Max concurrent calls (leave 1 buffer)
);

-- Get the account ID from the result above, then add agents
SELECT add_vapi_agents_to_account(
  'ACCOUNT_ID_FROM_ABOVE'::UUID,  -- Replace with actual account ID
  'YOUR_FREE_TRIAL_ASSISTANT_ID'::UUID,    -- Replace with real assistant ID
  'YOUR_STANDARD_ASSISTANT_ID'::UUID,      -- Replace with real assistant ID  
  'YOUR_EXTENDED_ASSISTANT_ID'::UUID,      -- Replace with real assistant ID
  1  -- Priority (1 = highest)
);
```

## 🔄 Step 2: Create Backup Account (Optional but Recommended)

```sql
-- Create Backup Production Account
SELECT create_vapi_vault_account(
  'Production Backup',
  'YOUR_ACTUAL_VAPI_API_KEY_2',  -- Replace with real API key
  'YOUR_ACTUAL_PHONE_NUMBER_ID_2'::UUID,  -- Replace with real phone ID
  9  -- Max concurrent calls
);

-- Add agents to backup account (lower priority)
SELECT add_vapi_agents_to_account(
  'BACKUP_ACCOUNT_ID_FROM_ABOVE'::UUID,  -- Replace with actual account ID
  'YOUR_FREE_TRIAL_ASSISTANT_ID_2'::UUID,  -- Can be same or different assistants
  'YOUR_STANDARD_ASSISTANT_ID_2'::UUID,
  'YOUR_EXTENDED_ASSISTANT_ID_2'::UUID,
  2  -- Priority (2 = backup)
);
```

## 📝 Step 3: Update Plan Assistant IDs

```sql
-- Update plans with your actual assistant IDs
UPDATE plans SET vapi_assistant_id = 'YOUR_FREE_TRIAL_ASSISTANT_ID'::UUID WHERE key = 'free_trial';
UPDATE plans SET vapi_assistant_id = 'YOUR_STANDARD_ASSISTANT_ID'::UUID WHERE key = 'standard';
UPDATE plans SET vapi_assistant_id = 'YOUR_EXTENDED_ASSISTANT_ID'::UUID WHERE key = 'extended';
```

## 🧪 Step 4: Test Your Setup

```sql
-- Run the test function to verify everything works
SELECT * FROM test_vapi_vault_setup();

-- Check account status
SELECT * FROM vapi_account_status;

-- Test agent availability for each plan type
SELECT 'free_trial' as plan_type, * FROM get_available_agent('free_trial')
UNION ALL
SELECT 'standard' as plan_type, * FROM get_available_agent('standard')  
UNION ALL
SELECT 'extended' as plan_type, * FROM get_available_agent('extended');
```

## ✅ Expected Results

After setup, you should see:
- ✅ **Vault Secrets**: PASS (2+ secrets found)
- ✅ **Active Accounts**: PASS (2+ accounts with vault keys)
- ✅ **Active Agents**: PASS (6+ agents found)
- ✅ **Key Decryption**: PASS (keys decrypt successfully)

## 🔒 Security Features

- ✅ **API keys encrypted** in Supabase Vault
- ✅ **No plain text keys** in database
- ✅ **Secure key retrieval** via dedicated functions
- ✅ **Proper access controls** with service role permissions

## 🚨 Important Notes

1. **Replace ALL placeholder values** with your actual VAPI credentials
2. **Test thoroughly** before going live
3. **Keep backup** of your VAPI credentials securely
4. **Monitor call counts** to ensure proper concurrency management

## 🆘 Troubleshooting

If tests fail:
1. **Check API keys** are valid and active in VAPI dashboard
2. **Verify phone number IDs** exist in your VAPI account
3. **Confirm assistant IDs** are correct and published
4. **Review vault permissions** if decryption fails

Your production VAPI system is now ready! 🎉