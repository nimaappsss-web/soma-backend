---
name: security-audit
description: Audit the codebase for security vulnerabilities
---

Perform a security audit. Check for:
- Authentication bypasses
- Missing authorization checks (role-based access)
- SQL injection via raw queries
- JWT token handling issues
- Sensitive data exposure
- Multi-tenant data leakage (cross-school access)
- OTP/brute-force protections
- Password hashing and reset flows
