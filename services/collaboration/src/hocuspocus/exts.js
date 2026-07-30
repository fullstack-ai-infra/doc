const StarterKit = require('@tiptap/starter-kit')
const Underline = require('@tiptap/extension-underline')
const TextAlign = require('@tiptap/extension-text-align')
const SubScript = require('@tiptap/extension-subscript')
const Superscript = require('@tiptap/extension-superscript')
const Highlight = require('@tiptap/extension-highlight')
const { TaskItem } = require('@tiptap/extension-task-item')
const { TaskList } = require('@tiptap/extension-task-list')
const Link = require('@tiptap/extension-link')

const basicExts = [StarterKit, Underline, TextAlign, SubScript, Superscript, Highlight, TaskList, TaskItem, Link]

module.exports = { basicExts }
