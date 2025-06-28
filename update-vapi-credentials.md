# 🔧 Update VAPI Credentials for Production

After running the migration, you need to update the placeholder values with your actual VAPI credentials.

## 📋 Required Information

You need to gather the following from your VAPI dashboard:

### 1. API Keys
- Primary account API key
- Backup account API key (if you have multiple)

### 2. Phone Number IDs
- Primary phone number ID
- Backup phone number ID (if you have multiple)

### 3. Agent IDs
- Free trial agent ID
- Standard plan agent ID  
- Extended plan agent ID
- (Backup agents if you have them)

### 4. Assistant IDs
- Free trial assistant ID
- Standard plan assistant ID
- Extended plan assistant ID

## 🔄 Update Process

Run these SQL commands in your Supabase SQL Editor, replacing the placeholder values:

```sql
-- Update Account 1 (Primary)
UPDATE vapi_accounts 
SET api_key = 'YOUR_ACTUAL_API_KEY_1',
    phone_number_id = 'YOUR_ACTUAL_PHONE_ID_1'::UUID
WHERE name = 'Production Primary';

-- Update vault secret for Account 1
DO $$
DECLARE
  account_id UUID;
  secret_name TEXT;
BEGIN
  SELECT id, vault_secret_name INTO account_id, secret_name
  FROM vapi_accounts WHERE name = 'Production Primary';
  
  -- Update the vault secret
  PERFORM vault.update_secret(secret_name, 'YOUR_ACTUAL_API_KEY_1');
END $$;

-- Update agents for Account 1
UPDATE vapi_agents 
SET agent_id = 'YOUR_FREE_TRIAL_AGENT_ID'::UUID
WHERE agent_type = 'free_trial' 
AND vapi_account_id = (SELECT id FROM vapi_accounts WHERE name = 'Production Primary');

UPDATE vapi_agents 
SET agent_id = 'YOUR_STANDARD_AGENT_ID'::UUID
WHERE agent_type = 'standard' 
AND vapi_account_id = (SELECT id FROM vapi_accounts WHERE name = 'Production Primary');

UPDATE vapi_agents 
SET agent_id = 'YOUR_EXTENDED_AGENT_ID'::UUID
WHERE agent_type = 'extended' 
AND vapi_account_id = (SELECT id FROM vapi_accounts WHERE name = 'Production Primary');

-- Update assistant IDs in plans
UPDATE plans SET vapi_assistant_id = 'YOUR_FREE_TRIAL_ASSISTANT_ID'::UUID WHERE key = 'free_trial';
UPDATE plans SET vapi_assistant_id = 'YOUR_STANDARD_ASSISTANT_ID'::UUID WHERE key = 'standard';
UPDATE plans SET vapi_assistant_id = 'YOUR_EXTENDED_ASSISTANT_ID'::UUID WHERE key = 'extended';
```

## ✅ Test the Setup

After updating, run this test:

```sql
SELECT * FROM test_vapi_vault_setup();
```

All tests should return 'PASS' status.

## 🚀 Production Ready!

Once all tests pass, your VAPI integration will be:
- ✅ Securely encrypted
- ✅ Production ready
- ✅ Scalable with multiple agents
- ✅ Fault tolerant with backup accounts