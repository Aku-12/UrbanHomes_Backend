const crypto = require('crypto');

/**
 * Generate HMAC SHA256 signature for eSewa payment
 * @param {string} message - The message to sign (total_amount,transaction_uuid,product_code)
 * @returns {string} - Base64 encoded signature
 */
const generateSignature = (message) => {
  const secretKey = process.env.ESEWA_SECRET_KEY;
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(message);
  return hmac.digest('base64');
};

/**
 * Verify eSewa payment signature
 * @param {string} signedFieldNames - Comma-separated field names that were signed
 * @param {object} data - Response data from eSewa
 * @param {string} signature - Signature to verify
 * @returns {boolean} - Whether signature is valid
 */
const verifySignature = (signedFieldNames, data, signature) => {
  const fields = signedFieldNames.split(',');
  const message = fields.map(field => `${field}=${data[field]}`).join(',');
  const expectedSignature = generateSignature(message);
  return expectedSignature === signature;
};

/**
 * Create eSewa payment payload
 * @param {object} params - Payment parameters
 * @returns {object} - eSewa payment form data
 */
const createPaymentPayload = ({ amount, taxAmount = 0, serviceCharge = 0, deliveryCharge = 0, transactionUuid, productCode }) => {
  const totalAmount = amount + taxAmount + serviceCharge + deliveryCharge;
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const signature = generateSignature(message);

  return {
    amount: amount.toString(),
    tax_amount: taxAmount.toString(),
    total_amount: totalAmount.toString(),
    transaction_uuid: transactionUuid,
    product_code: productCode,
    product_service_charge: serviceCharge.toString(),
    product_delivery_charge: deliveryCharge.toString(),
    success_url: `${process.env.FRONTEND_URL}/payment/success`,
    failure_url: `${process.env.FRONTEND_URL}/payment/failure`,
    signed_field_names: 'total_amount,transaction_uuid,product_code',
    signature
  };
};

module.exports = {
  generateSignature,
  verifySignature,
  createPaymentPayload
};
