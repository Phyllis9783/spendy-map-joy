export const CURRENCIES = {
  TWD: { symbol: 'NT$', name: '台幣', rate: 1 },
  USD: { symbol: '$', name: '美元', rate: 0.032 },
  JPY: { symbol: '¥', name: '日圓', rate: 4.7 },
  EUR: { symbol: '€', name: '歐元', rate: 0.030 }
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

/**
 * Format amount with currency symbol
 * @param amount - Amount in TWD (base currency)
 * @param targetCurrency - Target currency code
 * @returns Formatted string with currency symbol
 */
export const formatCurrency = (amount: number, targetCurrency: CurrencyCode = 'TWD'): string => {
  const currency = CURRENCIES[targetCurrency];
  const convertedAmount = amount * currency.rate;
  const rounded = Math.round(convertedAmount);
  
  return `${currency.symbol}${rounded.toLocaleString()}`;
};

/**
 * Convert amount from one currency to another
 * @param amount - Amount in source currency
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount
 */
export const convertCurrency = (
  amount: number, 
  fromCurrency: CurrencyCode, 
  toCurrency: CurrencyCode
): number => {
  // Convert to TWD first (base currency)
  const amountInTWD = amount / CURRENCIES[fromCurrency].rate;
  // Then convert to target currency
  return amountInTWD * CURRENCIES[toCurrency].rate;
};
