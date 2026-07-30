import { DocVersionSnapshotLike } from './types'

// 只比较标题和正文内容，用于判断是否需要生成新版本。
export function isSameVersionContent(
  previous: Pick<DocVersionSnapshotLike, 'title' | 'content'>,
  current: Pick<DocVersionSnapshotLike, 'title' | 'content'>
) {
  return previous.title === current.title && previous.content === current.content
}
