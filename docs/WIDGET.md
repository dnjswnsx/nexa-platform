# Embedding

Copy the actual code in `/app` → AI Agent. Add the host's **exact origin** (`https://academy.example`, including a non-default port when applicable) in Settings. The example `/embed-example.html` can be served from a separate website for verification.

The script uses a shadow root to isolate host styles and loads an iframe from the NEXA origin. Visitor API calls occur inside that iframe at the same origin, so API CORS is intentionally not broadly opened. The host CSP must permit the NEXA origin in `script-src` and `frame-src`. A production NEXA CSP must separately permit approved embedding hosts in `frame-ancestors`. The current development build does not yet enforce a per-agent CSP `frame-ancestors` policy.

Origin approval at session creation is an abuse deterrent, **not cryptographic proof of the host**: a caller can forge `hostOrigin`. Production should validate embedding parent origin via supported browser messaging and server policy and add bot protection/global session quotas. Each opaque visitor token scopes only its own conversation and lead. Public agent IDs are public identifiers, not secrets. Authentication secrets are never exposed. Parent-page code cannot read cross-origin iframe messages through DOM access.

The current visitor token is kept in iframe sessionStorage. Browsers restricting third-party storage can prevent persistence; validate those browsers before launch. Escape in the host closes the panel; iframe keyboard behavior needs further accessibility testing. No localhost preview link is published by onboarding.
