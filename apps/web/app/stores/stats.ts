import type { ActivityPointDto, ChatStatsDto, GlobalStatsDto, ParseDialogDto, ParseHistoryItem } from '@tg-analyzer/shared'

export const useStatsStore = defineStore('stats', {
  state: () => ({
    globalStats: null as GlobalStatsDto | null,
    chats: [] as ChatStatsDto[],
    selectedChat: null as ChatStatsDto | null,
    activity: [] as ActivityPointDto[],
    history: [] as ParseHistoryItem[],
    parseDialogs: [] as ParseDialogDto[],
    parseDialogsTruncated: false,
    parseDialogsTotal: 0,
    selectedParseDialogIds: [] as string[],
  }),
})
