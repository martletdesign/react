import {
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type ComponentPropsWithRef,
} from "react";

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      type={type}
      className={`martlet-button martlet-button--${variant} ${className}`}
      {...props}
    />
  );
}
export function TextInput({
  className = "",
  ...props
}: ComponentPropsWithRef<"input">) {
  return <input className={`martlet-input ${className}`} {...props} />;
}
export function Select({
  className = "",
  ...props
}: ComponentPropsWithRef<"select">) {
  return <select className={`martlet-input ${className}`} {...props} />;
}
export function Textarea({
  className = "",
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return <textarea className={`martlet-input ${className}`} {...props} />;
}
export type FieldControl = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};
export function Field({
  id: providedId,
  label,
  hint,
  error,
  hintId: providedHintId,
  errorId: providedErrorId,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  hintId?: string;
  errorId?: string;
  children: (props: FieldControl) => ReactNode;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  // Description IDs belong to this Field, independent of a caller-supplied control ID.
  const hintId = providedHintId ?? `${generatedId}-hint`;
  const errorId = providedErrorId ?? `${generatedId}-error`;
  const descriptions = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="martlet-field">
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-describedby": descriptions,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={hintId} className="martlet-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="martlet-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function Notice({
  kind = "info",
  children,
}: {
  kind?: "info" | "success" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={`martlet-notice martlet-notice--${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="martlet-badge">{children}</span>;
}
export function DataTable({
  caption,
  children,
  className = "",
  ...props
}: ComponentPropsWithRef<"table"> & { caption: string }) {
  return (
    <div
      className="martlet-table-scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className={`martlet-table ${className}`} {...props}>
        <caption>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
export function AppShell({
  brand,
  navigationLabel = "Workbench",
  navigationPlacement = "default",
  headerMode,
  navigation,
  utilities,
  children,
}: {
  brand: ReactNode;
  navigationLabel?: string;
  navigationPlacement?: "default" | "top" | "side" | "none";
  headerMode?: "light" | "dark";
  navigation: ReactNode;
  utilities: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="martlet-app" data-navigation={navigationPlacement}>
      <a className="martlet-skip" href="#main">
        Skip to content
      </a>
      <header className="martlet-app-header" data-martlet={headerMode}>
        <div className="martlet-app-brand">{brand}</div>
        {navigationPlacement !== "none" && (
          <nav aria-label={navigationLabel}>{navigation}</nav>
        )}
        <div className="martlet-app-utilities">{utilities}</div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
export function Dialog({
  open,
  title,
  onDismiss,
  children,
}: {
  open: boolean;
  title: string;
  onDismiss: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const suppressedCloseEvents = useRef(0);
  const id = useId();
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) {
      // The close event is queued; distinguish prop-driven closes from native ones.
      suppressedCloseEvents.current += 1;
      dialog.close();
    }
  }, [open]);
  return (
    <dialog
      className="martlet-dialog"
      ref={ref}
      aria-labelledby={id}
      onClose={() => {
        if (suppressedCloseEvents.current > 0) {
          suppressedCloseEvents.current -= 1;
        } else if (open && !ref.current?.open) {
          onDismiss();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <h2 id={id}>{title}</h2>
      {children}
    </dialog>
  );
}

export function Checkbox({
  label,
  id,
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type"> & { label: ReactNode }) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <label className={`martlet-checkbox ${className}`} htmlFor={controlId}>
      <input {...props} id={controlId} type="checkbox" />
      {label}
    </label>
  );
}
export function Fieldset({
  legend,
  hint,
  error,
  children,
  className = "",
  ...props
}: ComponentPropsWithRef<"fieldset"> & {
  legend: ReactNode;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const describedBy =
    [props["aria-describedby"], hint && `${id}-hint`, error && `${id}-error`]
      .filter(Boolean)
      .join(" ") || undefined;
  return (
    <fieldset
      {...props}
      className={`martlet-fieldset ${className}`}
      aria-describedby={describedBy}
      aria-invalid={error ? true : props["aria-invalid"]}
    >
      <legend>{legend}</legend>
      {hint && (
        <p id={`${id}-hint`} className="martlet-hint">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="martlet-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
export function Disclosure({
  summary,
  children,
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"details">, "children"> & {
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <details {...props} className={`martlet-disclosure ${className}`}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}

export type SummaryError = { message: string; targetId?: string };
export function ErrorSummary({
  title,
  errors = [],
  children,
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"div">, "title"> & {
  title: ReactNode;
  errors?: SummaryError[];
}) {
  const titleId = useId();
  return (
    <div
      {...props}
      tabIndex={-1}
      role="alert"
      aria-labelledby={titleId}
      className={`martlet-error-summary ${className}`}
    >
      <strong id={titleId}>{title}</strong>
      {errors.length > 0 && (
        <ul>
          {errors.map((error, index) => (
            <li key={index}>
              {error.targetId ? (
                <a
                  href={`#${error.targetId}`}
                  onClick={(event) => {
                    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    const owner = event.currentTarget.ownerDocument;
                    const target = owner.getElementById(error.targetId!);
                    if (target) {
                      target.focus();
                      // If focus cannot move, retain the link's native fragment navigation.
                      if (owner.activeElement === target) event.preventDefault();
                    }
                  }}
                >
                  {error.message}
                </a>
              ) : (
                error.message
              )}
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

export type ContentsItem = { id: string; label: ReactNode; depth?: 2 | 3 };
export function TableOfContents({
  items,
  label = "On this page",
  variant = "index",
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"nav">, "children"> & {
  items: readonly ContentsItem[];
  label?: string;
  variant?: "index" | "inline";
}) {
  return (
    <nav
      {...props}
      aria-label={label}
      className={`martlet-contents ${className}`}
      data-variant={variant}
    >
      <strong>{label}</strong>
      <ul>
        {items.map((item) => (
          <li key={item.id} data-depth={item.depth ?? 2}>
            <a href={`#${encodeURIComponent(item.id)}`}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
export function Article({
  title,
  titleLevel = 1,
  eyebrow,
  summary,
  metadata,
  contents,
  aside,
  contextLabel = "Article context",
  footer,
  children,
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"article">, "title"> & {
  title: ReactNode;
  titleLevel?: 1 | 2;
  eyebrow?: ReactNode;
  summary?: ReactNode;
  metadata?: ReactNode;
  contents?: ReactNode;
  aside?: ReactNode;
  contextLabel?: string;
  footer?: ReactNode;
}) {
  const titleId = useId();
  const Heading = titleLevel === 1 ? "h1" : "h2";
  return (
    <article
      {...props}
      aria-labelledby={titleId}
      className={`martlet-article ${className}`}
    >
      <header className="martlet-article-header">
        {eyebrow && <p className="martlet-article-eyebrow">{eyebrow}</p>}
        <Heading id={titleId}>{title}</Heading>
        {summary && <p className="martlet-article-summary">{summary}</p>}
        {metadata && <div className="martlet-article-metadata">{metadata}</div>}
      </header>
      <div className="martlet-article-layout" data-contents={!!contents}>
        {contents && <div className="martlet-article-context">{contents}</div>}
        <div className="martlet-prose">
          {children}
          {aside && <aside className="martlet-article-support" aria-label={contextLabel}>{aside}</aside>}
        </div>
      </div>
      {footer && <footer className="martlet-article-footer">{footer}</footer>}
    </article>
  );
}

export function FileInput({
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type" | "value" | "defaultValue">) {
  return (
    <input
      {...props}
      type="file"
      className={`martlet-file-input ${className}`}
    />
  );
}

export function Radio({
  label,
  id,
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type"> & { label: ReactNode }) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  return (
    <label className={`martlet-radio ${className}`} htmlFor={controlId}>
      <input {...props} id={controlId} type="radio" />
      {label}
    </label>
  );
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  disabled = false,
  label = "Pagination",
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"nav">, "children"> & {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const count = Number.isFinite(pageCount)
    ? Math.max(1, Math.trunc(pageCount))
    : 1;
  const current = Number.isFinite(page)
    ? Math.min(count, Math.max(1, Math.trunc(page)))
    : 1;
  const previousRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const focusedControl = useRef<"previous" | "next" | null>(null);
  useLayoutEffect(() => {
    if (disabled || count === 1) {
      focusedControl.current = null;
      return;
    }
    const owner = previousRef.current?.ownerDocument;
    if (!owner) return;
    const active = owner.activeElement;
    if (active !== owner.body && active !== previousRef.current && active !== nextRef.current) {
      focusedControl.current = null;
      return;
    }
    if (focusedControl.current === "next" && current === count && current > 1) previousRef.current?.focus();
    else if (focusedControl.current === "previous" && current === 1 && count > 1) nextRef.current?.focus();
  }, [current, count, disabled]);
  return (
    <nav
      {...props}
      aria-label={label}
      className={`martlet-pagination ${className}`}
    >
      <Button
        ref={previousRef}
        onFocus={() => { focusedControl.current = "previous"; }}
        onBlur={(event) => { if (!event.currentTarget.disabled) focusedControl.current = null; }}
        variant="secondary"
        disabled={disabled || current === 1}
        onClick={() => onPageChange(current - 1)}
      >
        Previous page
      </Button>
      <p aria-live="polite" aria-atomic="true">
        Page {current} of {count}
      </p>
      <Button
        ref={nextRef}
        onFocus={() => { focusedControl.current = "next"; }}
        onBlur={(event) => { if (!event.currentTarget.disabled) focusedControl.current = null; }}
        variant="secondary"
        disabled={disabled || current === count}
        onClick={() => onPageChange(current + 1)}
      >
        Next page
      </Button>
    </nav>
  );
}

export type DefinitionItem = {
  id: string;
  term: ReactNode;
  description: ReactNode;
};
export function DefinitionList({
  items,
  layout = "rows",
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"dl">, "children"> & {
  items: readonly DefinitionItem[];
  layout?: "rows" | "stack" | "grid";
}) {
  return (
    <dl {...props} className={`martlet-definitions ${className}`} data-layout={layout}>
      {items.map((item) => (
        <div key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Switch({
  label,
  id,
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type" | "role"> & {
  label: ReactNode;
}) {
  const generatedId = useId();
  return (
    <label htmlFor={id ?? generatedId} className="martlet-switch">
      <span className="martlet-switch-control">
        <input
          {...props}
          id={id ?? generatedId}
          type="checkbox"
          role="switch"
          className={className}
        />
        <span className="martlet-switch-track" aria-hidden="true">
          <span />
        </span>
      </span>
      <span>{label}</span>
    </label>
  );
}
export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
};
export function Tabs({
  items,
  value,
  onValueChange,
  label,
  orientation = "horizontal",
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"div">, "children" | "onChange"> & {
  items: readonly TabItem[];
  value: string;
  onValueChange: (id: string) => void;
  label: string;
  orientation?: "horizontal" | "vertical";
}) {
  const generatedId = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const enabled = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0);
  const selected = items.findIndex(
    (item) => item.id === value && !item.disabled,
  );
  const active = selected >= 0 ? selected : (enabled[0] ?? -1);
  const focused = items.findIndex((item) => item.id === focusedId && !item.disabled);
  const tabStop = focused >= 0 ? focused : active;
  const lastFocusedTab = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    const previous = lastFocusedTab.current;
    if (previous && (!previous.isConnected || previous.disabled)) {
      lastFocusedTab.current = null;
      const document = previous.ownerDocument;
      if (document.hasFocus() && (document.activeElement === document.body || document.activeElement === previous)) {
        buttons.current[active]?.focus();
      }
    }
  });
  return (
    <div {...props} className={`martlet-tabs ${className}`}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation={orientation}
        onBlur={(event) => {
          if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
            setFocusedId(null);
            const prior = lastFocusedTab.current;
            // Keep the last tab only when React has just disabled or removed it;
            // an ordinary blur, including a move to outside content, clears it.
            if (event.relatedTarget || !prior || (prior.isConnected && !prior.disabled)) lastFocusedTab.current = null;
          }
        }}
        onKeyDown={(event) => {
          const target = (event.target as HTMLElement).closest('[role="tab"]');
          const index = buttons.current.findIndex(
            (button) => button === target,
          );
          if (index < 0) return;
          const nextKey =
            orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
          const previousKey =
            orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
          let next: number | undefined;
          if (event.key === "Home") next = enabled[0];
          else if (event.key === "End") next = enabled.at(-1);
          else if (event.key === nextKey)
            next = enabled[(enabled.indexOf(index) + 1) % enabled.length];
          else if (event.key === previousKey)
            next =
              enabled[
                (enabled.indexOf(index) - 1 + enabled.length) % enabled.length
              ];
          if (next !== undefined) {
            event.preventDefault();
            buttons.current[next]?.focus();
          }
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            ref={(element) => {
              buttons.current[index] = element;
            }}
            id={`${generatedId}-tab-${index}`}
            aria-controls={`${generatedId}-panel-${index}`}
            aria-selected={index === active}
            tabIndex={index === tabStop ? 0 : -1}
            disabled={item.disabled}
            onFocus={(event) => { lastFocusedTab.current = event.currentTarget; setFocusedId(item.id); }}
            onClick={() => onValueChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${generatedId}-panel-${index}`}
          aria-labelledby={`${generatedId}-tab-${index}`}
          hidden={index !== active}
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
