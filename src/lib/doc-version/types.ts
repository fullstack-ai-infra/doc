export interface DocVersionSnapshotLike {
  title: string
  content: string
  contentBinaryBase64?: string
}

export interface DocVersionSnapshot extends DocVersionSnapshotLike {
  docId: string
  contentBinaryBase64: string
}

export interface IDocVersionListItem {
  id: string
  docId: string
  userId: string
  title: string
  createdAt: string
}

export interface IDocVersionDetail extends IDocVersionListItem {
  content: string
}
