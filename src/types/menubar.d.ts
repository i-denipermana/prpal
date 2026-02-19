declare module 'menubar' {
  import {
    BrowserWindow,
    Tray,
    App,
    Rectangle,
    BrowserWindowConstructorOptions,
    NativeImage,
  } from 'electron'

  // menubar v5.2.3 passes all options directly to BrowserWindow
  // So MenubarOptions extends BrowserWindowConstructorOptions
  export interface MenubarOptions extends BrowserWindowConstructorOptions {
    dir?: string
    index?: string | false
    appDir?: string
    tooltip?: string
    icon?: string | NativeImage
    preloadWindow?: boolean
    showOnAllWorkspaces?: boolean
    windowPosition?: string
    showDockIcon?: boolean
    activateWithApp?: boolean
    showOnRightClick?: boolean
    alwaysOnTop?: boolean
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
