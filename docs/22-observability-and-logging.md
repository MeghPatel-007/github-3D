# Observability and Logging

**Status:** MVP operations requirements  
**Project:** GitHub 3D: Code as a World

## 1. Goals

Make failures diagnosable without collecting unnecessary private code or user data. Observe both backend reliability and the user-visible health of the 3D workspace.

## 2. Structured server logs

Use structured logs with fields such as:
- `timestamp`
- `level`
- `requestId`
- `routeTemplate`
- `statusCode`
- `durationMs`
- `errorCode`
- `upstreamStatus`
- `retryAfterMs` when applicable

Do not log:
- Access tokens, OAuth codes, session IDs, cookies, or authorization headers.
- Full private source files or repository archives.
- Full request bodies by default.
- Secrets or sensitive query parameters.

Redact sensitive fields before serialization, not only in a downstream dashboard.

## 3. Request correlation

- Assign a random request ID at the API boundary.
- Return it in an `X-Request-Id` header and safe error bodies.
- Propagate it to internal analysis jobs where possible.
- Do not use repository names, usernames, or tokens as request IDs.

## 4. Key backend metrics

| Metric | Why it matters |
|---|---|
| Request count and error rate by route | Detect broken API flows |
| Request latency percentiles | Identify slow endpoints |
| GitHub upstream errors and rate-limit events | Separate app failures from upstream constraints |
| Import duration | Measure repository onboarding |
| Tree size and analyzed-file count | Understand workload |
| Analysis failures and unsupported-file count | Communicate analysis coverage |
| Cache hit rate, if caching exists | Evaluate performance |
| Session/auth callback failures | Diagnose login issues without logging secrets |

Avoid high-cardinality labels such as raw file paths, tokens, full repository names, or user IDs in metrics.

## 5. Frontend and 3D metrics

Capture coarse, privacy-conscious signals:
- Time to first usable workspace.
- Tree loading and dependency analysis duration.
- Approximate visible node and edge counts.
- Rendering frame-rate samples in aggregate, if supported.
- WebGL initialization failures and context loss.
- Search, focus, and selection failures.
- Whether the user received the 2D fallback.

Do not collect source text, keystrokes, or detailed navigation trails unless there is a clear, disclosed need and consent model.

## 6. Error reporting

Errors should include:
- Safe error category.
- Request ID or client event ID.
- App version.
- Browser/runtime version where useful.
- A sanitized stack trace when appropriate.

Before sending data to an external error provider, configure scrubbing for headers, cookies, URL parameters, and source content. Provide a way to disable optional telemetry where appropriate.

## 7. Alerts

Initial alert candidates:
- Sustained API 5xx rate above an agreed threshold.
- Authentication callback failures above baseline.
- GitHub rate-limit failures causing widespread import errors.
- Elevated WebGL initialization failures after a release.
- Production health check failures.

Thresholds should be set from observed traffic, not invented before baseline data exists.

## 8. Acceptance criteria

- Secrets and source content are redacted from logs and error reports.
- Errors can be correlated by request ID.
- Core API, import, and client rendering failures are observable.
- Telemetry has a documented retention and access policy.
- Alerts have an owner and a runbook.
