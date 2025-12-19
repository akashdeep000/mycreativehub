# Subscription System: Simple Overview

This system automates your member access and retention. Here is how it works:

### 1. The Member Experience
*   **Dashboard**: Members see their plan, price, and billing dates.
*   **Retention Flow**: If a member tries to cancel, they are shown the value they'll lose and offered a discount (configurable) before they can finish.
*   **Access**: Members keep access until their paid period ends, even after cancelling.

### 2. Automated Access (Systeme.io Integration)
*   **New Sale**: When a member buys on Systeme.io, the platform automatically grants them access.
*   **Cancellation**: When a subscription ends on Systeme.io, the platform automatically removes their access.
*   **Tags**: The system can automatically add a "Cancelled" tag to the contact in Systeme.io for your email marketing.

### 3. Setup & Configuration
You can control the system using these settings in your `.env` file:

| Setting | Description |
| :--- | :--- |
| `SYSTEME_API_KEY` | Connects the platform to your Systeme.io account. |
| `SYSTEME_CANCELLED_TAG_ID` | (Optional) The ID of the tag to add when someone cancels. |
| `VITE_DISCOUNT_OFFER_URL` | The link for the offer (Email or URL). |
| `VITE_DISCOUNT_OFFER_TEXT` | The big text shown in the offer (e.g., "30% OFF"). |
| `VITE_DISCOUNT_OFFER_BUTTON` | The text on the offer button (e.g., "Claim 30% Discount"). |

---
**How it handles the "End of Period":**
When a user cancels in the dashboard, we tell Systeme.io to "cancel at the end of the period." The user stays on your whitelist. Once the period actually ends, Systeme.io sends a signal (webhook) to our platform, and we then remove them from the whitelist automatically. No manual work required.
