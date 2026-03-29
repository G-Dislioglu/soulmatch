import { TOKENS } from '../../design';
import type { LiveTalkController } from '../../hooks/useLiveTalk';
import type { PageDef } from '../M02_ui-kit';
import type { UserProfile } from '../../shared/types/profile';
import { LiveTalkButton } from './LiveTalkButton';

export const SHELL_SIDEBAR_WIDTH = TOKENS.layout.sidebarW;
export const SHELL_SIDEBAR_COLLAPSED_WIDTH = 72;

interface SidebarProps {
  pages: PageDef[];
  activePage: number;
  onPageChange: (page: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  profile: UserProfile | null;
  onOpenSettings: () => void;
  liveTalk: LiveTalkController;
}

interface SidebarLogoProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function SidebarLogo({ collapsed, onToggleCollapse }: SidebarLogoProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 12,
        padding: collapsed ? '18px 10px' : '18px 18px 16px',
      }}
    >
      {!collapsed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: TOKENS.font.display, fontSize: 18, color: TOKENS.text, letterSpacing: '0.06em' }}>
            Soulmatch
          </span>
          <span style={{ fontFamily: TOKENS.font.body, fontSize: 10, color: TOKENS.text2, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Maya Core Shell
          </span>
        </div>
      ) : (
        <span style={{ fontFamily: TOKENS.font.display, fontSize: 22, color: TOKENS.gold }}>S</span>
      )}

      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Sidebar erweitern' : 'Sidebar minimieren'}
        style={{
          border: `1.5px solid ${TOKENS.b1}`,
          background: 'rgba(255,255,255,0.04)',
          color: TOKENS.text2,
          borderRadius: 12,
          width: 32,
          height: 32,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {collapsed ? '»' : '«'}
      </button>
    </div>
  );
}

interface MayaContextRowProps {
  collapsed: boolean;
  active: boolean;
}

export function MayaContextRow({ collapsed, active }: MayaContextRowProps) {
  if (collapsed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
        <span
          aria-hidden="true"
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: active ? TOKENS.green : TOKENS.gold,
            boxShadow: active ? '0 0 12px rgba(74,222,128,0.55)' : '0 0 12px rgba(212,175,55,0.4)',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px' }}>
      <span
        aria-hidden="true"
        style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: TOKENS.gold,
          boxShadow: '0 0 12px rgba(212,175,55,0.55)',
          flexShrink: 0,
        }}
      />
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ fontFamily: TOKENS.font.serif, fontSize: 18, color: TOKENS.text }}>
          Maya
        </span>
        <span style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: active ? TOKENS.green : TOKENS.text2 }}>
          {active ? 'LiveTalk aktiv' : 'Maya-Core verbunden'}
        </span>
      </span>
    </div>
  );
}

interface SidebarNavProps {
  pages: PageDef[];
  activePage: number;
  collapsed: boolean;
  onPageChange: (page: number) => void;
}

export function SidebarNav({ pages, activePage, collapsed, onPageChange }: SidebarNavProps) {
  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: collapsed ? '14px 8px' : '14px 14px 18px' }}>
      {pages.map((page, index) => {
        const isActive = index === activePage;
        return (
          <button
            key={page.label}
            type="button"
            onClick={() => onPageChange(index)}
            title={page.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 12,
              width: '100%',
              minHeight: 46,
              padding: collapsed ? '0' : '0 14px',
              borderRadius: 16,
              border: `1.5px solid ${isActive ? TOKENS.b1 : 'transparent'}`,
              background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
              color: isActive ? TOKENS.text : TOKENS.text2,
              cursor: 'pointer',
              transition: TOKENS.transition.fast,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{page.icon}</span>
            {!collapsed ? (
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                <span style={{ fontFamily: TOKENS.font.body, fontSize: 13, fontWeight: 500 }}>{page.label}</span>
                <span style={{ fontFamily: TOKENS.font.body, fontSize: 10, color: isActive ? page.color : TOKENS.text3 }}>
                  {isActive ? 'Aktiver Bereich' : 'Oeffnen'}
                </span>
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

interface ProfileRowProps {
  collapsed: boolean;
  profile: UserProfile | null;
  onOpenSettings: () => void;
}

export function ProfileRow({ collapsed, profile, onOpenSettings }: ProfileRowProps) {
  const initials = profile?.name?.slice(0, 1).toUpperCase() ?? 'S';

  if (collapsed) {
    return (
      <div style={{ padding: '14px 0 18px', display: 'flex', justifyContent: 'center' }}>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Profil und Einstellungen"
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: `1.5px solid ${TOKENS.b1}`,
            background: 'rgba(255,255,255,0.05)',
            color: TOKENS.text,
            cursor: 'pointer',
          }}
        >
          {initials}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 18px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: `1.5px solid ${TOKENS.b1}`,
            background: 'rgba(255,255,255,0.05)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: TOKENS.font.display,
            color: TOKENS.text,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 13, fontWeight: 500, color: TOKENS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {profile?.name ?? 'Profil anlegen'}
          </div>
          <div style={{ fontFamily: TOKENS.font.body, fontSize: 11, color: TOKENS.text2 }}>
            {profile?.birthDate ?? 'Noch kein Geburtsdatum'}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        style={{
          border: `1.5px solid ${TOKENS.b1}`,
          background: 'rgba(255,255,255,0.04)',
          color: TOKENS.text2,
          borderRadius: 12,
          minWidth: 38,
          height: 38,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        ⚙
      </button>
    </div>
  );
}

export function Sidebar({
  pages,
  activePage,
  onPageChange,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  profile,
  onOpenSettings,
  liveTalk,
}: SidebarProps) {
  const sidebarWidth = collapsed ? SHELL_SIDEBAR_COLLAPSED_WIDTH : SHELL_SIDEBAR_WIDTH;
  const divider = `1.5px solid ${TOKENS.b1}`;

  return (
    <>
      <aside
        className={`sidebar sm-sidebar-shell ${mobileOpen ? 'sidebar-mobile-open' : ''}`}
        style={{
          width: sidebarWidth,
          height: '100vh',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 45,
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(180deg, ${TOKENS.bg2} 0%, ${TOKENS.bg} 100%)`,
          overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <SidebarLogo collapsed={collapsed} onToggleCollapse={onToggleCollapse} />

        <div style={{ borderBottom: divider, padding: collapsed ? '12px 8px' : '0 14px 14px' }}>
          <LiveTalkButton variant="sidebar" liveTalk={liveTalk} />
        </div>

        <div style={{ borderBottom: divider }}>
          <MayaContextRow collapsed={collapsed} active={liveTalk.liveTalkActive} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', borderBottom: divider }} className="hidden-scrollbar">
          <SidebarNav
            pages={pages}
            activePage={activePage}
            collapsed={collapsed}
            onPageChange={onPageChange}
          />
        </div>

        <ProfileRow collapsed={collapsed} profile={profile} onOpenSettings={onOpenSettings} />
      </aside>

      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Sidebar schliessen"
        onClick={onMobileClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 44,
          background: 'rgba(0,0,0,0.45)',
          border: 'none',
          display: mobileOpen ? 'block' : 'none',
        }}
      />
    </>
  );
}