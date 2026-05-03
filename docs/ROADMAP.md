# MVP Hardening Roadmap

## Next High-Value Changes

1. Decide auth ownership.
   - Keep current JWT auth and add password reset/email verification, or migrate to Supabase Auth.
   - Do not run both for the same users without a migration plan.

2. Replace base64 uploads.
   - Use signed direct upload to Cloudinary or Supabase Storage.
   - Keep API server out of large image payload path.

3. Add full E2E tests.
   - Use a dedicated staging Supabase project.
   - Cover signup, login, product CRUD, public store, sale registration, and image upload.

4. Add external monitoring.
   - Sentry or equivalent for frontend and backend.
   - Alert on 5xx rate and failed login spikes.

5. Clean database ownership.
   - Confirm whether `lojas/produtos/pedidos` belong to another product version.
   - Remove or archive only after backup and owner approval.

6. Improve storefront conversion.
   - Product OpenGraph tags.
   - Storefront SEO.
   - Copy store link button.
   - Product duplication and "mark sold" actions.
