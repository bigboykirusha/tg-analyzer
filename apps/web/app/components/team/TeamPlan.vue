<script setup lang="ts">
import { PLAN_IDS, PLAN_LIMITS, type TeamDto } from '@tg-analyzer/shared'
import { Check } from '../../lib/icons'

/**
 * The team's plan: how much of it is used and what the others add. While
 * billing is off there is nothing to pay; a bigger plan is arranged by message.
 */
const props = defineProps<{ team: TeamDto }>()
const { t } = useI18n()

const meters = computed(() => [
  { key: 'members', label: t('plan.members'), used: props.team.memberCount, limit: props.team.limits.members },
  { key: 'reports', label: t('plan.reports'), used: props.team.reportCount, limit: props.team.limits.sharedReports },
])
const percent = (used: number, limit: number) => Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))

const plans = computed(() =>
  PLAN_IDS.map((id) => ({
    id,
    name: t(`plans.${id}.name`),
    price: t(`plans.${id}.price`),
    features: [
      t('plan.featureMembers', { count: PLAN_LIMITS[id].members }),
      t('plan.featureReports', { count: PLAN_LIMITS[id].sharedReports }),
      t(`plans.${id}.extra`),
    ],
    current: id === props.team.plan,
  })),
)
</script>

<template>
  <UiPageSection :title="t('plan.title')" :hint="t('plan.current', { plan: t(`plans.${team.plan}.name`) })">
    <div class="tile usage">
      <div v-for="meter in meters" :key="meter.key" class="meter">
        <span class="meter__head">
          <span>{{ meter.label }}</span>
          <span class="t-num">{{ meter.used }} / {{ meter.limit }}</span>
        </span>
        <span
          class="meter__track"
          role="meter"
          :aria-label="meter.label"
          :aria-valuenow="meter.used"
          aria-valuemin="0"
          :aria-valuemax="meter.limit"
        >
          <span
            class="meter__fill"
            :class="{ 'is-full': meter.used >= meter.limit }"
            :style="{ width: `${percent(meter.used, meter.limit)}%` }"
          />
        </span>
      </div>
    </div>

    <ul class="plans">
      <li v-for="plan in plans" :key="plan.id" class="tile plan" :class="{ 'is-current': plan.current }">
        <span class="plan__head">
          <strong class="t-title">{{ plan.name }}</strong>
          <span v-if="plan.current" class="plan__badge">{{ t('plan.yours') }}</span>
        </span>
        <span class="plan__price t-num">{{ plan.price }}</span>
        <ul class="plan__features">
          <li v-for="feature in plan.features" :key="feature"><Check aria-hidden="true" />{{ feature }}</li>
        </ul>
      </li>
    </ul>
    <p class="plans__note">{{ team.billingEnabled ? t('plan.billingOn') : t('plan.billingOff') }}</p>
  </UiPageSection>
</template>

<style scoped>
.usage {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-6);
  padding: var(--space-5);
}

.meter {
  display: grid;
  gap: var(--space-2);
}

.meter__head {
  display: flex;
  justify-content: space-between;
  font: var(--text-ui);
}

.meter__head > :last-child {
  color: var(--text-muted);
}

.meter__track {
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.meter__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.meter__fill.is-full {
  background: var(--warning);
}

.plans {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.plan {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  padding: var(--space-5);
}

.plan.is-current {
  box-shadow: 0 0 0 1.5px var(--accent);
}

.plan__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.plan__badge {
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--lime);
  color: var(--on-lime);
  font: var(--text-caption);
  font-weight: 600;
}

.plan__price {
  font: var(--text-h3);
}

.plan__features {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.plan__features li {
  display: flex;
  gap: var(--space-2);
}

.plan__features svg {
  flex: none;
  margin-top: 2px;
  color: var(--text);
  --icon-size: var(--icon-sm);
}

.plans__note {
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 900px) {
  .plans {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .usage {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }
}
</style>
