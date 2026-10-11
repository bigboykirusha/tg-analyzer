<script setup lang="ts">
useSeoMeta({
  title: 'Terms of Service',
  description: 'Draft terms of service for TG Analyzer.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <main class="legal-page">
    <article class="legal-card">
      <NuxtLink class="legal-back" to="/login">← Back to sign in</NuxtLink>
      <p class="legal-kicker">TG Analyzer · Draft</p>
      <h1>Terms of Service</h1>
      <p>Last updated: October 11, 2026. This draft requires product-owner and legal review before public launch.</p>

      <h2>Service</h2>
      <p>
        TG Analyzer creates analytics from Telegram chats that you are authorized to access. It is not affiliated with
        Telegram.
      </p>

      <h2>Your responsibilities</h2>
      <p>
        You must comply with Telegram’s terms and applicable law, obtain any required permissions, protect your own
        account, and not use the service to analyze data you are not entitled to access.
      </p>

      <h2>Availability and reports</h2>
      <p>
        Reports are informational and may be incomplete when source data, access, or third-party services are
        unavailable. Do not use them as the sole basis for consequential decisions.
      </p>

      <h2>Termination and data</h2>
      <p>
        You may stop using the service and delete your account in account settings. We may suspend access to protect the
        service, comply with law, or address abuse. Complete governing-law, limitation-of-liability, and contact clauses
        before release.
      </p>
    </article>
  </main>
</template>

<style scoped>
.legal-page {
  min-height: 100dvh;
  padding: clamp(24px, 6vw, 80px) 16px;
  background: var(--bg-base);
  color: var(--text-primary);
}
.legal-card {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: clamp(24px, 5vw, 56px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  box-shadow: var(--shadow-md);
}
.legal-card h1 {
  margin: 8px 0 20px;
  font-size: clamp(2rem, 6vw, 3rem);
}
.legal-card h2 {
  margin: 32px 0 8px;
  font-size: 1.2rem;
}
.legal-card p {
  color: var(--text-secondary);
  line-height: 1.65;
}
.legal-kicker,
.legal-back {
  color: var(--accent);
  font-size: 0.875rem;
}
.legal-back {
  text-decoration: none;
}
</style>
