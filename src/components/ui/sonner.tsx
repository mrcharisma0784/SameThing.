import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:min-h-9 group-[.toast]:rounded-full group-[.toast]:border group-[.toast]:border-accent/40 group-[.toast]:bg-accent group-[.toast]:px-3.5 group-[.toast]:font-medium group-[.toast]:text-accent-foreground group-[.toast]:shadow-sm group-[.toast]:transition-opacity hover:group-[.toast]:opacity-90 focus-visible:group-[.toast]:outline-none focus-visible:group-[.toast]:ring-2 focus-visible:group-[.toast]:ring-accent/40",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
