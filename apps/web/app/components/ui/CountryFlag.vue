<script setup lang="ts">
defineProps<{ code: string }>()
</script>

<template>
  <svg class="country-flag-svg" viewBox="0 0 24 18" role="img" :aria-label="code">
    <template v-if="code === 'RU'">
      <path fill="#fff" d="M0 0h24v6H0z" />
      <path fill="#2451a4" d="M0 6h24v6H0z" />
      <path fill="#d52b1e" d="M0 12h24v6H0z" />
    </template>
    <template v-else-if="code === 'KZ'">
      <path fill="#00afca" d="M0 0h24v18H0z" />
      <path fill="#f5d547" d="M2 0h2v18H2z" />
      <circle cx="14" cy="8" r="3" fill="#f5d547" />
      <path fill="#f5d547" d="m9 12 5 3 5-3-2 4H11z" />
    </template>
    <template v-else-if="code === 'AM'">
      <path fill="#d90012" d="M0 0h24v6H0z" />
      <path fill="#0033a0" d="M0 6h24v6H0z" />
      <path fill="#f2a800" d="M0 12h24v6H0z" />
    </template>
    <template v-else-if="code === 'GE'">
      <path fill="#fff" d="M0 0h24v18H0z" />
      <path
        fill="#ff0000"
        d="M10 0h4v18h-4zM0 7h24v4H0zM4 2h2v4H4zM2 4h6v2H2zM18 2h2v4h-2zM16 4h6v2h-6zM4 12h2v4H4zM2 12h6v2H2zM18 12h2v4h-2zM16 12h6v2h-6z"
      />
    </template>
    <template v-else-if="code === 'BY'">
      <path fill="#d22730" d="M4 0h20v12H4z" />
      <path fill="#00af66" d="M4 12h20v6H4z" />
      <path fill="#fff" d="M0 0h4v18H0z" />
      <path fill="#d22730" d="M1 1h2v2H1zm0 4h2v3H1zm0 5h2v3H1zm0 5h2v2H1z" />
    </template>
    <template v-else-if="code === 'UA'">
      <path fill="#0057b8" d="M0 0h24v9H0z" />
      <path fill="#ffd700" d="M0 9h24v9H0z" />
    </template>
    <template v-else-if="code === 'US'">
      <path fill="#fff" d="M0 0h24v18H0z" />
      <path fill="#b22234" d="M0 0h24v2H0zm0 4h24v2H0zm0 4h24v2H0zm0 4h24v2H0zm0 4h24v2H0z" />
      <path fill="#3c3b6e" d="M0 0h11v10H0z" />
      <path
        fill="#fff"
        d="m2 2 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2zm4 0 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2zm4 0 .4 1.1h1.2l-1 .7.4 1.1-1-.7-1 .7.4-1.1-1-.7h1.2z"
      />
    </template>
    <template v-else-if="code === 'GB'">
      <path fill="#012169" d="M0 0h24v18H0z" />
      <path stroke="#fff" stroke-width="5" d="m0 0 24 18M24 0 0 18" />
      <path stroke="#c8102e" stroke-width="2" d="m0 0 24 18M24 0 0 18" />
      <path fill="#fff" d="M9 0h6v18H9zM0 6h24v6H0z" />
      <path fill="#c8102e" d="M10.5 0h3v18h-3zM0 7.5h24v3H0z" />
    </template>
    <template v-else-if="code === 'DE'">
      <path fill="#000" d="M0 0h24v6H0z" />
      <path fill="#dd0000" d="M0 6h24v6H0z" />
      <path fill="#ffce00" d="M0 12h24v6H0z" />
    </template>
    <template v-else-if="code === 'PL'">
      <path fill="#fff" d="M0 0h24v9H0z" />
      <path fill="#dc143c" d="M0 9h24v9H0z" />
    </template>
    <template v-else-if="code === 'TR'">
      <path fill="#e30a17" d="M0 0h24v18H0z" />
      <circle cx="10" cy="9" r="5" fill="#fff" />
      <circle cx="12" cy="9" r="4" fill="#e30a17" />
      <path fill="#fff" d="m16 6 .7 2h2.1l-1.7 1.2.7 2-1.8-1.3-1.7 1.3.7-2L13.2 8h2.1z" />
    </template>
    <template v-else-if="code === 'AE'">
      <path fill="#f00" d="M0 0h6v18H0z" />
      <path fill="#00732f" d="M6 0h18v6H6z" />
      <path fill="#fff" d="M6 6h18v6H6z" />
      <path fill="#000" d="M6 12h18v6H6z" />
    </template>
    <template v-else-if="code === 'IL'">
      <path fill="#fff" d="M0 0h24v18H0z" />
      <path fill="#0038b8" d="M0 2h24v2H0zm0 12h24v2H0z" />
      <path fill="none" stroke="#0038b8" stroke-width="1.2" d="m12 5 3.5 6H8.5zm0 8L8.5 7h7z" />
    </template>
    <template v-else-if="code === 'IN'">
      <path fill="#ff9933" d="M0 0h24v6H0z" />
      <path fill="#fff" d="M0 6h24v6H0z" />
      <path fill="#138808" d="M0 12h24v6H0z" />
      <circle cx="12" cy="9" r="2.2" fill="none" stroke="#000080" stroke-width=".7" />
      <circle cx="12" cy="9" r=".5" fill="#000080" />
    </template>
  </svg>
</template>

<style scoped>
.country-flag-svg {
  display: block;
  width: 22px;
  height: 17px;
  overflow: hidden;
  border-radius: 3px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--text) 12%, transparent);
}
</style>
