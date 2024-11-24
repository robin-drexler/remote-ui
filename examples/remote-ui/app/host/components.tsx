import {type ComponentChildren} from 'preact';
import {forwardRef} from 'preact/compat';
import {useRef, useImperativeHandle, useEffect} from 'preact/hooks';

import type {
  ButtonProperties,
  StackProperties,
  TextProperties,
  ModalMethods,
  ModalProperties,
} from '../types.ts';

export function Text({
  emphasis,
  children,
}: {children?: ComponentChildren} & TextProperties) {
  return (
    <span
      class={['Text', emphasis && 'Text--emphasis'].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  );
}

export function Button({
  onPress,
  modal,
  children,
}: {
  children?: ComponentChildren;
  modal?: ComponentChildren;
} & ButtonProperties) {
  console.log('#modal', modal);
  return (
    <>
      <button
        class="Button"
        type="button"
        onClick={() =>
          onPress?.() ?? document.querySelector('dialog')?.showModal()
        }
      >
        {children}
      </button>
      {modal}
    </>
  );
}

export function Stack({
  spacing,
  children,
}: {children?: ComponentChildren} & StackProperties) {
  return (
    <div
      class={['Stack', spacing && 'Stack--spacing'].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

export const Modal = forwardRef<
  ModalMethods,
  {
    children?: ComponentChildren;
    primaryAction?: ComponentChildren;
  } & ModalProperties
>(function Modal({children, primaryAction, onClose}, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useImperativeHandle(ref, () => ({
    open() {
      dialogRef.current?.showModal();
    },
    close() {
      dialogRef.current?.close();
    },
  }));

  useEffect(() => {
    dialogRef.current?.showModal();

    return () => {
      dialogRef.current?.close();
    };
  }, [dialogRef.current]);

  return (
    <dialog ref={dialogRef} class="Modal" onClose={() => onClose?.()}>
      <div class="Modal-Content">{children}</div>
      {primaryAction && <div class="Modal-Actions">{primaryAction}</div>}
    </dialog>
  );
});
