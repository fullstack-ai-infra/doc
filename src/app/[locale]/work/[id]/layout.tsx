import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import TopBar from './top-bar'
import BottomBar from './bottom-bar'
import { Separator } from '@/components/ui/separator'
import { LogOut } from 'lucide-react'
import UserSettingButton from '@/components/user-setting-button'
import SignOutButton from '@/components/sign-out-button'
import Trash from '../(dialog-pages)/trash'
import StarList from '../(dialog-pages)/star-list'
import SearchComp from '../(dialog-pages)/search'
import WorkHomeLink from '@/components/work-home-link'
import ShareList from '../(dialog-pages)/share-list'
import PubDocList from '../(dialog-pages)/pub-list'
import { getTranslations } from 'next-intl/server'

export default async function Layout({
  params,
  children,
  directory, // parallel route
}: Readonly<{
  params: { id: string }
  children: React.ReactNode
  directory: React.ReactNode
}>) {
  const userInfoTrans = await getTranslations('userInfo')

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen min-w-[1440px] overflow-auto">
      <ResizablePanel defaultSize={15} className="min-w-44 max-w-[500px]">
        <div className="flex flex-col h-screen bg-muted text-muted-foreground p-2">
          <div>
            <UserSettingButton />
            <WorkHomeLink />
            <SearchComp />
            <StarList />
            <ShareList />
            <PubDocList />
          </div>
          <Separator className="my-2" />
          <div className="flex-auto overflow-y-auto">{directory}</div>
          <Separator className="my-2" />
          <div>
            <Trash />
            <SignOutButton className="w-full justify-start px-2 h-8" variant="ghost">
              <LogOut className="h-4 w-4 mr-1" />
              {userInfoTrans('logout')}
            </SignOutButton>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={85}>
        <div className="h-screen flex flex-col relative">
          {/* top bar */}
          <TopBar />
          {/* content */}
          <div className="flex-auto">{children}</div>
          {/* bottom bar */}
          <BottomBar />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
