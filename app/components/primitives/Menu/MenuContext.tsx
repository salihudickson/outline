import type { RefObject } from "react";
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
  submenuTriggerRefs: Record<string, RefObject<HTMLDivElement>>;
  addSubmenuTriggerRef: (id: string, ref: RefObject<HTMLDivElement>) => void;
  mainMenuRef: React.RefObject<HTMLDivElement>;
};

const MenuContext = createContext<MenuContextType>({
  variant: "dropdown",
  activeSubmenu: null,
  setActiveSubmenu: () => {},
  submenuTriggerRefs: {},
  addSubmenuTriggerRef: () => {},
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
  const [submenuTriggerRefs, setSubmenuTriggerRefs] = useState<
    Record<string, RefObject<HTMLDivElement>>
  >({});
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const addSubmenuTriggerRef = useCallback(
    (key: string, ref: RefObject<HTMLDivElement>) => {
      setSubmenuTriggerRefs((prevRefs) => ({
        ...prevRefs,
        [key]: ref,
      }));
    },
    [setSubmenuTriggerRefs]
  );

  const ctx = useMemo(
    () => ({
      variant,
      activeSubmenu,
      setActiveSubmenu,
      submenuTriggerRefs,
      addSubmenuTriggerRef,
      mainMenuRef,
    }),
    [
      variant,
      activeSubmenu,
      mainMenuRef,
      submenuTriggerRefs,
      addSubmenuTriggerRef,
    ]
  );

  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
}

export const useMenuContext = () => useContext(MenuContext);
