import { User } from 'lucide-react'

interface IProps {
  content: string
}

export default function ChatItemUser(props: IProps) {
  const { content } = props

  return (
    <div className="flex items-start gap-1 justify-end my-4 mt-8 first:mt-2 ">
      <div className="text-sm text-gray-700 bg-blue-200 dark:bg-blue-800 dark:text-gray-300 p-2 py-1 rounded-md ml-2">
        {content}
      </div>
      <div className="w-5">
        <User className="w-5 h-5 text-gray-600 mt-1" />
      </div>
    </div>
  )
}
