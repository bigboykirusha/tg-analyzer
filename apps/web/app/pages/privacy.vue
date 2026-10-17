<script setup lang="ts">
useSeoMeta({
  title: 'Privacy Policy',
  description: 'Draft privacy policy for TG Analyzer.',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <main class="legal-page">
    <article class="legal-card">
      <NuxtLink class="legal-back" to="/login">← Back to sign in</NuxtLink>
      <p class="legal-kicker">TG Analyzer · Draft</p>
      <h1>Privacy Policy</h1>
      <p>
        Last updated: October 11, 2026. This draft must be reviewed by the product owner and legal counsel before public
        launch.
      </p>

      <h2>What we process</h2>
      <p>
        We process your Telegram account identifier and profile fields needed to provide access, encrypted Telegram
        session material, authentication-session records, selected chat metadata, parse-job status, and aggregated
        analytics. The application is designed not to retain original message text in report storage.
      </p>

      <h2>Why we process it</h2>
      <p>
        Data is used only to authenticate you, retrieve chats you choose, calculate the requested analytics, operate the
        service, and secure it against abuse.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        Analytics data follows the configured retention policy. You can delete your account from authenticated account
        settings. Deletion revokes application sessions, removes stored account data and encrypted Telegram
        authorization material, and schedules cleanup of queued work.
      </p>

      <h2>Security and contact</h2>
      <p>
        Session material is encrypted at rest and refresh cookies are HttpOnly. Do not submit sensitive information
        through support channels. Add the controller’s legal name, jurisdiction, and privacy contact before publishing
        this policy.
      </p>
    </article>
  </main>
</template>

<style scoped>
.legal-page {
  min-height: 100dvh;
  padding: clamp(24px, 6vw, 80px) 16px;
  background: var(--bg);
  color: var(--text);
}
.legal-card {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: clamp(24px, 5vw, 56px);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow);
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
  color: var(--text-muted);
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
