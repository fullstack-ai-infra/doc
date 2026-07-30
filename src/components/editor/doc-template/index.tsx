'use client'

import { CONTENT_WIDTH } from '@/constants'
import ResumeTemplate from './templates/resume'
import ProjectHighLightTemplate from './templates/project-highlight'
import TodosTemplate from './templates/todos'

export default function DocTemplate() {
  return (
    <div
      className="absolute bottom-12 bg-background"
      style={{ width: `75%`, maxWidth: `${CONTENT_WIDTH}px`, transform: `translateX(-50%)`, left: '50%' }}
    >
      <div className="grid grid-cols-3 gap-4">
        <ResumeTemplate />
        <ProjectHighLightTemplate />
        <TodosTemplate />
      </div>
    </div>
  )
}
