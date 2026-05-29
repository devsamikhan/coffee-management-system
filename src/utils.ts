/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const formatCurrency = (amount: number, currency: string = "PKR "): string => {
  return `${currency}${amount.toFixed(2)}`;
};

export const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
};

export const formatDateTime = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
};

// Generates and triggers download of a custom styled CSV file
export const downloadCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.map(val => {
        // Sanitize commas and quotes
        const strVal = String(val);
        if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      }).join(","))].join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Simple calculations helper for POS
export const calculateOrderTotals = (
  items: { price: number; quantity: number }[],
  taxRate: number,
  discount: { type: 'percentage' | 'fixed'; value: number } | null
) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  let discountAmount = 0;
  if (discount) {
    if (discount.type === 'percentage') {
      discountAmount = (subtotal * discount.value) / 100;
    } else {
      discountAmount = discount.value;
    }
  }
  
  // Guarantee discount doesn't exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);
  
  const taxableAmount = subtotal - discountAmount;
  const tax = taxableAmount * taxRate;
  const total = taxableAmount + tax;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    discountAmount: parseFloat(discountAmount.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};
