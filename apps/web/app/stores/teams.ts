import type { TeamSummaryDto } from '@tg-analyzer/shared'
import { api } from '../composables/useApi'
import type { LoadState } from './workspace'

/** The teams the signed-in person belongs to; each team page loads its own details. */
export const useTeamsStore = defineStore('teams', {
  state: () => ({
    teams: [] as TeamSummaryDto[],
    state: 'idle' as LoadState,
  }),
  actions: {
    async load() {
      this.state = this.teams.length ? 'ready' : 'loading'
      try {
        this.teams = (await api('GET /api/v1/teams')).teams
        this.state = 'ready'
      } catch (error) {
        this.state = 'error'
        throw error
      }
    },

    async create(name: string) {
      const team = await api('POST /api/v1/teams', { body: { name } })
      this.teams.push(team)
      return team
    },

    forget(teamId: string) {
      this.teams = this.teams.filter((team) => team.id !== teamId)
    },

    reset() {
      this.$reset()
    },
  },
})
