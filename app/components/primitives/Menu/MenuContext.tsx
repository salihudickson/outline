import {
  createContext,
  useContext,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

type MenuVariant = "dropdown" | "context" | "inline";

type MenuContextType = {
  variant: MenuVariant;
  activeSubmenu: string | null;
  setActiveSubmenu: (id: string | null) => void;
  getSubmenuTrigger: (id: string | null) => HTMLElement | null;
  mainMenuRef: React.RefObject<HTMLDivElement>;
};

const MenuContext = createContext<MenuContextType>({
  variant: "dropdown",
  activeSubmenu: null,
  setActiveSubmenu: () => {},
  getSubmenuTrigger: () => null,
  mainMenuRef: { current: null },
});

export function MenuProvider({
  variant,
  children,
}: {
  variant: MenuVariant;
  children: React.ReactNode;
}) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const getSubmenuTrigger = useCallback((id: string | null) => {
    if (!id || !mainMenuRef.current) {
      return null;
    }

    return mainMenuRef.current.querySelector<HTMLElement>(
      `[data-submenu-trigger="${id}"]`
    );
  }, []);

  const ctx = useMemo(
    () => ({
      variant,
      activeSubmenu,
      setActiveSubmenu,
      getSubmenuTrigger,
      mainMenuRef,
    }),
    [variant, activeSubmenu, getSubmenuTrigger, mainMenuRef]
  );

  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
}

export const useMenuContext = () => useContext(MenuContext);
