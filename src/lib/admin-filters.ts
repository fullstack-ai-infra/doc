export const adminDocDeleteStatusOptions = ['all', 'active', 'deleted'] as const
export const adminDocPublishStatusOptions = ['all', 'published', 'frozen', 'unpublished', 'never'] as const

export type AdminDocDeleteStatus = (typeof adminDocDeleteStatusOptions)[number]
export type AdminDocPublishStatus = (typeof adminDocPublishStatusOptions)[number]
