# Update VAPI Production IDs

After running the migrations, you need to update the placeholder UUIDs with your actual VAPI IDs from your VAPI dashboard.

## Step 1: Get Your VAPI IDs

1. **Log into your VAPI dashboard**: https://dashboard.vapi.ai
2. **Get your API Key**: Go to Settings > API Keys
3. **Get Agent IDs**: Go to Agents and copy the UUID for each agent
4. **Get Assistant IDs**: Go to Assistants and copy the UUID for each assistant  
5. **Get Phone Number IDs**: Go to Phone Numbers and copy the UUID for each number

## Step 2: Update the Migration File

Edit `supabase/migrations/20250127000002_update_production_vapi_ids.sql` and replace:

```sql
-- Replace these with your actual VAPI IDs:
'your-actual-free-trial-agent-uuid-here'
'your-actual-standard-agent-uuid-here'
'your-actual-extended-agent-uuid-here'
'your-actual-free-trial-assistant-uuid'
'your-actual-standard-assistant-uuid'
'your-actual-extended-assistant-uuid'
'your-actual-phone-number-uuid-1'
'your-actual-phone-number-uuid-2'
```

## Step 3: Update API Keys

In the first migration file `supabase/migrations/20250127000001_setup_production_vapi_accounts.sql`, replace:

```sql
vapi_api_key_1 TEXT := 'c498bc1e-5fc2-470b-a0ac-9a7b8b06ccd3'; -- Replace with actual key
vapi_api_key_2 TEXT := 'your-second-vapi-api-key-here'; -- Replace with actual key
```

## Step 4: Run the Migrations

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the first migration file
4. Run the second migration file
5. Run the test script to verify everything works

## Step 5: Test the Setup

Run the test script `test-vapi-vault-setup.sql` to verify:
- ✅ Vault secrets are created
- ✅ VAPI accounts are set up
- ✅ VAPI agents are configured
- ✅ Plans have assistant IDs
- ✅ Key decryption works
- ✅ get_available_agent function works

## Production Checklist

- [ ] Updated all VAPI agent IDs with real values
- [ ] Updated all VAPI assistant IDs with real values  
- [ ] Updated all phone number IDs with real values
- [ ] Updated API keys with production keys
- [ ] Tested vault key retrieval
- [ ] Tested get_available_agent function
- [ ] Verified no old problematic data exists
- [ ] All tests pass

Your VAPI vault setup will be production-ready once all these steps are completed!