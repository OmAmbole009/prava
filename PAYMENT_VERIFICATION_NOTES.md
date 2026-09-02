# Payment Verification Notes

## Google Pay / UPI activation boundary

Prava does not render a Google Pay or UPI QR without a verified merchant destination. Google’s web guidance states that online Google Pay UPI integrations require a verified UPI merchant, bank details for the UPI ID, payment-status APIs, and a unique transaction ID for each transaction. NPCI distinguishes static and dynamic QR modes; this does not make a QR scan a server-side payment confirmation on its own. Accordingly, the product keeps the Google Pay/UPI QR surface inactive until the owner supplies a merchant-controlled UPI ID, legal payee name, and a bank/PSP verification mechanism.

## Razorpay activation boundary

Razorpay’s standard web integration requires server-created orders, server-side checkout signature verification, and webhook validation using the raw request body. Razorpay’s webhook guidance also requires idempotency handling through the event identifier and warns that events can be retried or delivered out of order. The product therefore keeps Razorpay inactive until live credentials and a verified public webhook endpoint are available.

## References

1. [Google Pay for India: Integrating Google Pay with your site](https://developers.google.com/pay/india/api/web/intro)
2. [Google Pay for Business setup](https://developers.google.com/pay/india/api/googlepay-business)
3. [NPCI: UPI overview and QR payments](https://www.npci.org.in/product/upi)
4. [Razorpay: Standard Checkout integration steps](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
5. [Razorpay: Validate and test webhooks](https://razorpay.com/docs/webhooks/validate-test/)
