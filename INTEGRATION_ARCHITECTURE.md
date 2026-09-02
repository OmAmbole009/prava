# External Integration Architecture Notes

## Razorpay subscriptions

The planned India-first provider is Razorpay. Its official subscription flow supports provider-side plan creation, subscription creation, checkout integration, and management operations including update, pause, resume, cancel, and subscription invoice retrieval.[1]

Prava must treat provider webhooks as the subscription source of truth. Razorpay documents subscription lifecycle events including authentication, activation, charges, completion, updates, pending states, pauses, resumptions, cancellation, and halted subscriptions.[2] Provider events must not be assumed to arrive in order.

Webhook verification must use the raw request body and the `X-Razorpay-Signature` value. Razorpay specifies an HMAC-SHA256 digest with the configured webhook secret, and states that a duplicate event can be identified through `x-razorpay-event-id`.[3] The `paymentEvents` table exists to make that deduplication and signature-verification workflow explicit.

The current application provides the plan, subscription, payment, invoice, and usage data models plus server-side entitlement enforcement. It does **not** claim that a payment is complete or a paid subscription is active until a verified provider webhook is recorded. Razorpay API credentials and a webhook secret are still required before activating provider checkout or webhook handlers.

## Government filing boundary

The GST vertical slice may prepare records and present review status, but it must not represent a GST return as submitted or accepted without a legitimate, authorized official integration. The workflow state model distinguishes preparation, professional review, submission pending, submitted, accepted, and rejected.

## References

[1] [Razorpay Subscriptions APIs](https://razorpay.com/docs/api/payments/subscriptions/)

[2] [Razorpay Subscription Webhook Events](https://razorpay.com/docs/webhooks/subscriptions/)

[3] [Razorpay Webhook Validation and Testing](https://razorpay.com/docs/webhooks/validate-test/)
