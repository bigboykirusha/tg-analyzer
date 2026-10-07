# 0007 security token cutover

This migration revokes every refresh session created before purpose-bound version 2 tokens were deployed. Users must sign in again once after deployment.

The revocation is intentionally irreversible: a rollback of application code must not reactivate previously issued credentials. To roll the release back, deploy compatible code while keeping `revoked_at` unchanged. A new login creates a new refresh family.

The migration contains one idempotent `UPDATE`; rerunning it does not reactivate or duplicate data.
