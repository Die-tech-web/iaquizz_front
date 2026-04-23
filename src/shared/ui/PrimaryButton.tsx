import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  wide?: boolean;
}

export function PrimaryButton({
  children,
  className,
  wide = false,
  ...props
}: PropsWithChildren<PrimaryButtonProps>) {
  return (
    <button
      {...props}
      className={`primary-button${wide ? ' primary-button--wide' : ''}${className ? ` ${className}` : ''}`}
    >
      {children}
    </button>
  );
}
