export const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ children, ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  // Ensure we only pass a single child to Slot component
  const childArray = React.Children.toArray(children);
  const singleChild = childArray.length === 1 
    ? children 
    : <span>{children}</span>;

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    >
      {singleChild}
    </Slot>
  );
});