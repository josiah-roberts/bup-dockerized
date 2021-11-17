import { JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

export const Editable = ({
  children,
  value,
  onSubmit,
}: {
  children?: (value: string) => JSX.Element;
  value: string;
  onSubmit: (newValue: string, oldValue: string) => Promise<void>;
}) => {
  const [currentValue, updateCurrentValue] = useState(value);
  const [state, setState] = useState<"display" | "edit" | "submit">("display");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "edit" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state, inputRef]);

  const doReset = () => {
    updateCurrentValue(value);
    setState("display");
  };

  const doSubmit = async () => {
    setState("submit");
    try {
      await onSubmit(currentValue, value);
      setState("display");
    } catch (e: any) {
      alert(e?.message);
      doReset();
    }
  };

  return state === "display" ? (
    <span onClick={() => setState("edit")}>
      {!children ? currentValue : children(currentValue)}
    </span>
  ) : (
    <input
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          doReset();
          e.preventDefault();
          e.stopPropagation();
        }
        if (e.key === "Enter") doSubmit();
      }}
      disabled={state === "submit"}
      ref={inputRef}
      value={currentValue}
      onInput={(e) => updateCurrentValue(e.currentTarget.value)}
    />
  );
};
