export const CONTENT_WIDTH = 760 // 内容宽度
export const EDITOR_PADDING_BOTTOM = 200 // 编辑器 padding-bottom
export const EDITOR_CHARACTER_LIMIT = 50000 // 编辑器字数限制，

export const WORK_CONTENT_SCROLL_CONTAINER = 'work-content-scroll-container'
export const WORK_CONTENT_CONTAINER_ID = 'work-content-container'
export const WORK_CONTENT_PANEL_ID = 'work-content-panel'
export const DOC_TITLE_INPUT_ID = 'DOC_TITLE_INPUT_ID'
export const LAST_DOC_ID_KEY = 'LAST_DOC_ID'

export const DEFAULT_NEW_DOC_TITLE = '欢迎使用 doc'
export const DEFAULT_NEW_DOC_CONTENT =
  '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"doc","marks":[{"type":"bold","attrs":{}}]},{"type":"text","text":" 是面向人与 AI Agent 的自托管协作文档基础设施。"}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"从这里开始记录想法、共同编辑，并用可恢复的版本历史保存重要决定。"}]},{"type":"heading","attrs":{"textAlign":"left","level":2},"content":[{"type":"text","text":"三个原则"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"文档和部署选择归用户所有"}]}]},{"type":"listItem","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"人与 Agent 共用一套可审阅的文档事实"}]}]},{"type":"listItem","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"协作和版本恢复不依赖单一托管平台"}]}]}]}]}'
export const DEFAULT_NEW_DOC_TITLE_EN = 'Welcome to doc'
export const DEFAULT_NEW_DOC_CONTENT_EN =
  '{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"doc","marks":[{"type":"bold","attrs":{}}]},{"type":"text","text":" is self-hosted collaborative document infrastructure for people and AI agents."}]},{"type":"paragraph","attrs":{"textAlign":"left"},"content":[{"type":"text","text":"Start here, collaborate in realtime, and preserve important decisions with recoverable version history."}]}]}'

export const MAX_DOC_COUNT = 100 // 最大文档数量

export const AI_RES_MAX_TOKENS = 600 // AI 返回结果最大长度
export const AI_CONTEXT_MAX_LENGTH = 600 // 上下文最大长度，请求 AI 接口时
export const AI_PANEL_HISTORY_TURNS = 3 // AI 面板：默认携带最近 N 轮历史（user+assistant 成对）
export const AI_DEFAULT_TOKEN_LIMIT = 100000 // AI 默认 token limit
export const AI_REQUEST_DELAY = 5 // AI 请求间隔时间 秒

export const EVENT_KEY_NAV_DOC = 'E_K_NAV_DOC'
export const EVENT_KEY_FOCUS_AI = 'E_K_FOCUS_AI'
export const EVENT_KEY_FOCUS_CONTENT = 'E_K_FOCUS_CONTENT' // 聚焦到编辑器内容区域
export const EVENT_KEY_FOCUS_EDITOR = 'E_K_FOCUS_EDITOR' // 聚焦到编辑器
export const EVENT_KEY_INSERT_TO_EDITOR = 'E_K_INSERT_TO_EDITOR' // 插入到编辑器
export const EVENT_KEY_REPLACE_EDITOR_SEL_CONTENT = 'E_K_REPLACE_EDITOR_SEL_CONTENT' // 替换编辑器选中内容
export const EVENT_KEY_EDITOR_AI_MENU = 'E_K_EDITOR_AI_MENU' // 编辑器 AI 菜单

export const EVENT_SET_EDITOR_READONLY = 'E_K_EDITOR_READONLY' // 设置编辑器只读
export const EVENT_SET_EDITOR_EDITABLE = 'E_K_EDITOR_EDITABLE' // 设置编辑器可编辑

export const MAX_SHARE_COUNT = 10 // 最大分享人数

export const COLLABORATE_EDIT_USER_COLORS = [
  '#958DF1',
  '#F98181',
  '#FBBC88',
  '#FAF594',
  '#70CFF8',
  '#94FADB',
  '#B9F18D',
  '#C3E2C2',
  '#EAECCC',
  '#AFC8AD',
  '#EEC759',
  '#9BB8CD',
  '#FF90BC',
  '#FFC0D9',
  '#DC8686',
  '#7ED7C1',
  '#F3EEEA',
  '#89B9AD',
  '#D0BFFF',
  '#FFF8C9',
  '#CBFFA9',
  '#9BABB8',
  '#E3F4F4',
]

export const DOC_ICON_LIST = [
  '📄',
  '📚',
  '🛠',
  '🙃',
  '😝',
  '😇',
  '🤓',
  '🙄',
  '🥶',
  '💾',
  '🏪',
  '⏰',
  '🕵️‍♀️',
  '🔬',
  '🗺',
  '💜',
  '🐵',
  '🐶',
  '🐻',
  '🐰',
  '🐈‍⬛',
  '🐈',
  '🐕',
  '🦒',
  '🐪',
  '🦓',
  '🍌',
  '🍒',
  '🍋',
  '🍎',
  '🍉',
  '🌽',
  '🌶️',
  '🌏',
  '🏠',
  '🧭',
  '🌐',
  '🏖️',
  '🏗️',
  '🎡',
  '🎃',
  '🎄',
  '🎲',
  '⛺',
  '🥾',
  '🎵',
  '🎹',
  '🎸',
  '🔔',
  '📢',
  '🎤',
  '🎨',
  '🧨',
  '🔥',
  '🎈',
  '🌙',
  '⭐',
  '🌞',
  '🌊',
  '👓',
  '🕶️',
  '🛍️',
  '💊',
  '⚽',
  '🏀',
  '🚗',
  '🚐',
  '🚄',
  '🛩️',
  '🚲',
]
