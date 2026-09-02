# Authentication Verification Notes

The browser-level OAuth flow was tested against the protected Prava routes. An initial callback was correctly rejected after its one-time state expired. A fresh sign-in then completed successfully and redirected to the authenticated onboarding screen.

The protected dashboard subsequently loaded the signed-in user’s workspace shell and data query successfully. The current empty-workspace state was displayed as expected. The dashboard’s profile menu button is located below the initial browser viewport, so the sign-out action requires scrolling to the sidebar footer before it can be exercised.

The final session check succeeded end to end. The browser reached the authenticated onboarding and dashboard routes after a fresh OAuth sign-in. The authenticated logout procedure returned `{ "success": true }`; a subsequent protected-dashboard request immediately redirected to the sign-in endpoint. This confirms that a valid session reaches protected routes and that logout revokes that access in the browser.
