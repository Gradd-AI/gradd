// app/acca/cases/[id]/layout.tsx
//
// Exists for ONE reason: to receive the `@answer` parallel slot, so the intercepted worked answer
// can render OVER the case without unmounting it. It adds no chrome — `CaseSession` owns the
// whole viewport and its own header/footer, and a wrapper element here would sit between that
// 100vh shell and the page, which is the sort of thing that quietly breaks a flex column.
//
// The slot renders AFTER `children` so the overlay paints above the case in DOM order as well as
// by z-index. On any URL that is not `/acca/cases/<id>/answer/<reqId>` the slot resolves to
// `@answer/default.tsx`, which is null.

export default function CaseLayout({
  children,
  answer,
}: {
  children: React.ReactNode;
  answer: React.ReactNode;
}) {
  return (
    <>
      {children}
      {answer}
    </>
  );
}
