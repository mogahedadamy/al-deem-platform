export type PaymentDetails = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  referenceHint: string;
};

/**
 * بيانات التحويل المنشورة للطالب. تبقى خالية حتى يضبطها التشغيل عبر environment
 * بدلاً من تثبيت معلومات مالية غير معتمدة داخل الكود.
 */
export function paymentDetails(): PaymentDetails | null {
  const bankName = process.env.PAYMENT_BANK_NAME?.trim();
  const accountName = process.env.PAYMENT_ACCOUNT_NAME?.trim();
  const accountNumber = process.env.PAYMENT_ACCOUNT_NUMBER?.trim();
  if (!bankName || !accountName || !accountNumber) return null;
  return {
    bankName,
    accountName,
    accountNumber,
    referenceHint: process.env.PAYMENT_REFERENCE_HINT?.trim() || "اكتب اسم المتدرب أو رقم التسجيل في خانة البيان إن أمكن.",
  };
}
