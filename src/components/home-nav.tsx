import Logo from './logo-component'
import ChangeTheme from './change-theme'
import ChangeLocale from './change-locale'

export default function HomeNav() {
  return (
    <div className="text-secondary-foreground fixed top-0 left-0 right-0 h-10 flex">
      <div className="text-start p-2">
        <Logo />
      </div>
      <div className="flex-1 text-end p-2">
        <div className="inline-flex items-center">
          <ChangeLocale />
          <ChangeTheme />
        </div>
      </div>
    </div>
  )
}
