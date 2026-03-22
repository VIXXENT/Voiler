import * as React from 'react'

/**
 * Props for the Button component.
 */
export type ButtonProps = {
  readonly onClick: () => void
  readonly children: React.ReactNode
  readonly className?: string
};

/**
 * Explicitly typed Button component using arrow functions.
 * Follows GemTest Constitution for parameter destructuring and independent types.
 */
export const Button: React.FC<ButtonProps> = (
  props: ButtonProps,
): React.ReactElement => {
  const { onClick, children, className = '' }: ButtonProps = props
  
  // Combine base styles with custom className
  const combinedClassName: string = `px-4 py-2 bg-indigo-600 text-white rounded-md 
    hover:bg-indigo-700 transition-colors ${className}`

  return (
    <button
      onClick={onClick}
      className={combinedClassName}
    >
      {children}
    </button>
  )
}
