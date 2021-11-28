import { ComponentType, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/**
 * There's a known issue where if you button-mash it'll loose track of the cursor
 * @param As What kind of element to render
 * @returns A component
 */
export function AsEditable<K extends keyof JSX.IntrinsicElements>(As: K) {
  return ({
    onSubmit,
    onInput,
    onReset,
    value,
    ...rest
  }: Omit<
    JSX.IntrinsicElements[K],
    "children" | "onSubmit" | "onInput" | "value" | "ref"
  > & {
    value: string;
    onSubmit?: (newValue: string) => void;
    onInput: (newValue: string) => void;
    onReset?: () => void;
  }) => {
    const [state, setState] = useState<"display" | "edit" | "submit">(
      "display"
    );
    const elementRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (elementRef.current && elementRef.current.innerText !== value)
        elementRef.current.innerText = value;
    }, [elementRef, value]);

    useEffect(() => {
      if (state === "edit" && elementRef.current) {
        const range = document.createRange();
        range.selectNodeContents(elementRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }, [state, elementRef]);

    const doReset = () => {
      setState("display");
      onReset?.();
    };

    const doSubmit = async () => {
      setState("submit");
      try {
        const text = elementRef.current?.innerText;
        if (text != undefined) {
          onSubmit?.(text);
        }
        setState("display");
      } catch (e: any) {
        alert(e?.message);
        doReset();
      }
    };

    const NastyCast = As as unknown as ComponentType<Record<string, unknown>>;

    return (
      <NastyCast
        style={{ cursor: state === "display" ? "pointer" : "default" }}
        onClick={() => setState("edit")}
        {...rest}
        onBlur={() => state === "edit" && doReset()}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Escape") {
            doReset();
          }
          if (e.key === "Enter") doSubmit();
        }}
        onInput={(e: InputEvent) => {
          if (elementRef.current) {
            onInput?.(elementRef.current.innerText);
          }
        }}
        contentEditable={state === "edit"}
        ref={elementRef}
      />
    );
  };
}
