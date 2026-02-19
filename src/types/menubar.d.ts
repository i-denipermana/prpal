declare module 'menubar' {
  import { BrowserWindow, Tray, App, Rectangle, BrowserWindowConstructorOptions } from 'electron'

  export interface MenubarOptions {
    dir?: string
    index?: string | false
    appDir?: string
    tooltip?: string
    icon?: string
    preloadWindow?: boolean
    showOnAllWorkspaces?: boolean
    windowPosition?: string
    showDockIcon?: boolean
    browserWindow?: BrowserWindowConstructorOptions
    activateWithApp?: boolean
  }

  export interface Menubar {
    app: App
    window?: BrowserWindow
    tray: Tray
    positioner: {
      calculate: (position: string, bounds?: Rectangle) => { x: number; y: number }
    }
    setOption: <K extends keyof MenubarOptions>(option: K, value: MenubarOptions[K]) => void
    getOption: <K extends keyof MenubarOptions>(option: K) => MenubarOptions[K]
    showWindow: () => void
    hideWindow: () => void
    on: (event: string, listener: (...args: unknown[]) => void) => void
  }

  // menubar v5.2.3 default export is the create function directly
  function createMenubar(options?: MenubarOptions): Menubar
  export default createMenubar
  export { createMenubar as menubar }
  export type { Menubar, MenubarOptions }
}
