import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      visibleToasts={4}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "glass-strong flex items-center gap-3 w-[min(360px,90vw)] rounded-xl px-4 py-3.5 shadow-2xl font-body",
          title: "text-[13px] font-semibold text-ink",
          description: "text-[11px] text-ink-muted",
          icon: "shrink-0",
        },
      }}
    />
  );
}
