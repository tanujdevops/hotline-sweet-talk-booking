// Debug script to test NOWPayments minimum amounts
// Run with: node debug_nowpayments.js

const API_KEY = 'YOUR_NOWPAYMENTS_API_KEY'; // Replace with actual key

async function testMinimumAmounts() {
  console.log('Testing NOWPayments minimum amounts...\n');
  
  // Test popular cryptocurrencies
  const currencies = ['btc', 'eth', 'usdttrc20', 'usdcmatic', 'usdtbep20'];
  
  for (const currency of currencies) {
    try {
      const response = await fetch(
        `https://api.nowpayments.io/v1/min-amount?currency_from=usd&currency_to=${currency}`,
        {
          headers: {
            'x-api-key': API_KEY
          }
        }
      );
      
      const data = await response.json();
      console.log(`${currency.toUpperCase()}: Min $${data.min_amount || 'N/A'} USD`);
    } catch (error) {
      console.log(`${currency.toUpperCase()}: Error - ${error.message}`);
    }
  }
}

async function testFixedRateEstimate() {
  console.log('\nTesting fixed rate estimate for $9.99...\n');
  
  try {
    const response = await fetch(
      'https://api.nowpayments.io/v1/estimate?amount=9.99&currency_from=usd&currency_to=usdttrc20',
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );
    
    const data = await response.json();
    console.log('Variable Rate Estimate:', data);
  } catch (error) {
    console.log('Estimate Error:', error.message);
  }
}

// Run tests
testMinimumAmounts().then(() => testFixedRateEstimate());