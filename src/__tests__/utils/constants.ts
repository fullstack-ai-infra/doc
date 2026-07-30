import { IDoc } from '@/stores/docs-store'

export const TEST_DOC_ID = 'test_doc_id'
export const TEST_DOC_TITLE = 'test_doc_title'
export const TEST_DOC: IDoc = { id: TEST_DOC_ID, title: TEST_DOC_TITLE, icon: null, parentId: null }

export const TEST_DOC_ID2 = 'test_doc_id2'
export const TEST_DOC_TITLE2 = 'test_doc_title2'
export const TEST_DOC2: IDoc = { id: TEST_DOC_ID2, title: TEST_DOC_TITLE2, icon: null, parentId: null }

export const TEST_USER1 = { email: 'james@gmail.com', name: 'James', id: 'james' }

export const TEST_USER2_NAME = 'Lily'
export const TEST_USER2_EMAIL = 'lily@gmail.com'
export const TEST_USER2 = { email: TEST_USER2_EMAIL, name: TEST_USER2_NAME, id: 'lily' }
