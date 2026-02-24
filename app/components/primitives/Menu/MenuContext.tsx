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
  /** Refs to the rendered content elements of each active submenu, keyed by submenu id. */
  submenuContentRefs: Record<string, RefObject<HTMLDivElement | null>>;
  addSubmenuContentRef: (
    id: string,
    ref: RefObject<HTMLDivElement | null>
  ) => void;
  mainMenuRef: React.RefObject<HTMLDivElement>;
  /** Closes the entire inline menu (no-op for non-inline variants). */
  closeMenu: () => void;
};

const MenuContext = createContext<MenuContextType>({
  variant: "dropdown",
  activeSubmenu: null,
  setActiveSubmenu: () => {},
  submenuTriggerRefs: {},
  addSubmenuTriggerRef: () => {},
  submenuContentRefs: {},
  addSubmenuContentRef: () => {},
  mainMenuRef: { current: null },
  closeMenu: () => {},
});

export function MenuProvider({
  variant,
  onCloseMenu,
  children,
}: {
  variant: MenuVariant;
  /** Called when a menu button is activated to close the entire inline menu. */
  onCloseMenu?: () => void;
  children: React.ReactNode;
}) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuTriggerRefs, setSubmenuTriggerRefs] = useState<
    Record<string, RefObject<HTMLDivElement>>
  >({});
  const [submenuContentRefs, setSubmenuContentRefs] = useState<
    Record<string, RefObject<HTMLDivElement | null>>
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
  const addSubmenuContentRef = useCallback(
    (key: string, ref: RefObject<HTMLDivElement | null>) => {
      setSubmenuContentRefs((prevRefs) => ({
        ...prevRefs,
        [key]: ref,
      }));
    },
    [setSubmenuContentRefs]
  );

  const closeMenu = useCallback(() => {
    onCloseMenu?.();
  }, [onCloseMenu]);

  const ctx = useMemo(
    () => ({
      variant,
      activeSubmenu,
      setActiveSubmenu,
      submenuTriggerRefs,
      addSubmenuTriggerRef,
      submenuContentRefs,
      addSubmenuContentRef,
      mainMenuRef,
      closeMenu,
    }),
    [
      variant,
      activeSubmenu,
      mainMenuRef,
      submenuTriggerRefs,
      addSubmenuTriggerRef,
      submenuContentRefs,
      addSubmenuContentRef,
      closeMenu,
    ]
  );

  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
}

export const useMenuContext = () => useContext(MenuContext);
